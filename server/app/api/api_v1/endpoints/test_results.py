from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from beanie import PydanticObjectId

from ....models.mongodb_models import (
    TestResult, TestStatistics, StudentProgress,
    TestResultCreate, TestResultUpdate, TestResultResponse,
    StudentProgressResponse, InstructorStatsResponse,
    TestAnswer, User
)
from ....core.security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/start", response_model=TestResultResponse)
async def start_test(
    test_data: TestResultCreate,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Start a new test attempt"""
    try:
        # Check if user has exceeded max attempts
        if test_data.max_attempts:
            existing_attempts = await TestResult.find(
                TestResult.user_id == str(current_user.id),
                TestResult.test_id == test_data.test_id
            ).count()
            
            if existing_attempts >= test_data.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Maximum attempts ({test_data.max_attempts}) exceeded"
                )
        
        # Get attempt number
        attempt_number = await TestResult.find(
            TestResult.user_id == str(current_user.id),
            TestResult.test_id == test_data.test_id
        ).count() + 1
        
        # Create new test result
        test_result = TestResult(
            user_id=str(current_user.id),
            test_id=test_data.test_id,
            test_title=test_data.test_title,
            subject_id=test_data.subject_id,
            subject_name=test_data.subject_name,
            total_questions=test_data.total_questions,
            answered_questions=0,
            correct_answers=0,
            total_points=float(test_data.total_questions),
            earned_points=0.0,
            percentage=0.0,
            time_limit=test_data.time_limit,
            time_taken=0,
            started_at=datetime.utcnow(),
            status="in_progress",
            attempt_number=attempt_number,
            max_attempts=test_data.max_attempts,
            passing_score=test_data.passing_score,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        await test_result.insert()
        
        return TestResultResponse(
            id=str(test_result.id),
            user_id=test_result.user_id,
            test_id=test_result.test_id,
            test_title=test_result.test_title,
            subject_name=test_result.subject_name,
            total_questions=test_result.total_questions,
            answered_questions=test_result.answered_questions,
            correct_answers=test_result.correct_answers,
            total_points=test_result.total_points,
            earned_points=test_result.earned_points,
            percentage=test_result.percentage,
            grade=test_result.grade,
            time_taken=test_result.time_taken,
            time_limit=test_result.time_limit,
            status=test_result.status,
            is_passed=test_result.is_passed,
            attempt_number=test_result.attempt_number,
            started_at=test_result.started_at,
            completed_at=test_result.completed_at
        )
        
    except Exception as e:
        logger.error(f"Error starting test: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start test"
        )

@router.put("/{result_id}/submit", response_model=TestResultResponse)
async def submit_test(
    result_id: str,
    test_update: TestResultUpdate,
    current_user: User = Depends(get_current_user)
):
    """Submit test answers and calculate score"""
    try:
        # Find test result
        test_result = await TestResult.get(PydanticObjectId(result_id))
        if not test_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test result not found"
            )
        
        # Verify ownership
        if test_result.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to submit this test"
            )
        
        # Calculate score
        correct_answers = 0
        earned_points = 0.0
        
        for answer in test_update.answers:
            if answer.is_correct:
                correct_answers += 1
                earned_points += answer.points_earned
        
        percentage = (earned_points / test_result.total_points) * 100 if test_result.total_points > 0 else 0
        is_passed = percentage >= test_result.passing_score
        
        # Determine grade
        grade = "F"
        if percentage >= 90:
            grade = "A"
        elif percentage >= 80:
            grade = "B"
        elif percentage >= 70:
            grade = "C"
        elif percentage >= 60:
            grade = "D"
        
        # Update test result
        test_result.answers = test_update.answers
        test_result.answered_questions = len(test_update.answers)
        test_result.correct_answers = correct_answers
        test_result.earned_points = earned_points
        test_result.percentage = percentage
        test_result.grade = grade
        test_result.time_taken = test_update.time_taken
        test_result.completed_at = datetime.utcnow()
        test_result.status = test_update.status
        test_result.is_passed = is_passed
        test_result.updated_at = datetime.utcnow()
        
        await test_result.save()
        
        # Update student progress
        await update_student_progress(current_user.id, test_result)
        
        # Update test statistics (async)
        await update_test_statistics(test_result)
        
        return TestResultResponse(
            id=str(test_result.id),
            user_id=test_result.user_id,
            test_id=test_result.test_id,
            test_title=test_result.test_title,
            subject_name=test_result.subject_name,
            total_questions=test_result.total_questions,
            answered_questions=test_result.answered_questions,
            correct_answers=test_result.correct_answers,
            total_points=test_result.total_points,
            earned_points=test_result.earned_points,
            percentage=test_result.percentage,
            grade=test_result.grade,
            time_taken=test_result.time_taken,
            time_limit=test_result.time_limit,
            status=test_result.status,
            is_passed=test_result.is_passed,
            attempt_number=test_result.attempt_number,
            started_at=test_result.started_at,
            completed_at=test_result.completed_at,
            answers=test_result.answers
        )
        
    except Exception as e:
        logger.error(f"Error submitting test: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit test"
        )

@router.get("/my-results", response_model=List[TestResultResponse])
async def get_my_test_results(
    subject_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get current user's test results"""
    try:
        query = TestResult.find(TestResult.user_id == str(current_user.id))
        
        if subject_id:
            query = query.find(TestResult.subject_id == subject_id)
        
        results = await query.sort(-TestResult.completed_at).limit(limit).to_list()
        
        return [
            TestResultResponse(
                id=str(result.id),
                user_id=result.user_id,
                test_id=result.test_id,
                test_title=result.test_title,
                subject_name=result.subject_name,
                total_questions=result.total_questions,
                answered_questions=result.answered_questions,
                correct_answers=result.correct_answers,
                total_points=result.total_points,
                earned_points=result.earned_points,
                percentage=result.percentage,
                grade=result.grade,
                time_taken=result.time_taken,
                time_limit=result.time_limit,
                status=result.status,
                is_passed=result.is_passed,
                attempt_number=result.attempt_number,
                started_at=result.started_at,
                completed_at=result.completed_at
            )
            for result in results
        ]
        
    except Exception as e:
        logger.error(f"Error getting test results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get test results"
        )

@router.get("/my-progress", response_model=List[StudentProgressResponse])
async def get_my_progress(
    current_user: User = Depends(get_current_user)
):
    """Get current user's learning progress"""
    try:
        progress_records = await StudentProgress.find(
            StudentProgress.user_id == str(current_user.id)
        ).to_list()
        
        return [
            StudentProgressResponse(
                user_id=progress.user_id,
                subject_id=progress.subject_id,
                subject_name=progress.subject_name,
                total_tests=progress.total_tests,
                completed_tests=progress.completed_tests,
                passed_tests=progress.passed_tests,
                average_score=progress.average_score,
                best_score=progress.best_score,
                latest_score=progress.latest_score,
                improvement_trend=progress.improvement_trend,
                total_study_time=progress.total_study_time,
                last_attempt=progress.last_attempt,
                weak_topics=progress.weak_topics,
                strong_topics=progress.strong_topics
            )
            for progress in progress_records
        ]
        
    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get progress"
        )

@router.get("/instructor-stats", response_model=InstructorStatsResponse)
async def get_instructor_stats(
    current_user: User = Depends(get_current_user)
):
    """Get instructor statistics (for instructors only)"""
    try:
        if not (current_user.is_instructor or current_user.is_superuser):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only instructors can access this endpoint"
            )
        
        instructor_id = str(current_user.id)
        
        # Get basic stats
        total_tests = await TestResult.find(
            TestResult.instructor_id == instructor_id
        ).count()
        
        total_attempts = await TestResult.find(
            TestResult.instructor_id == instructor_id,
            TestResult.status == "completed"
        ).count()
        
        # Get unique students
        unique_students_pipeline = [
            {"$match": {"instructor_id": instructor_id, "status": "completed"}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "total"}
        ]
        unique_students_result = await TestResult.aggregate(unique_students_pipeline).to_list()
        total_students = unique_students_result[0]["total"] if unique_students_result else 0
        
        # Get average score and pass rate
        completed_results = await TestResult.find(
            TestResult.instructor_id == instructor_id,
            TestResult.status == "completed"
        ).to_list()
        
        if completed_results:
            total_score = sum(result.percentage for result in completed_results)
            average_class_score = total_score / len(completed_results)
            passed_count = sum(1 for result in completed_results if result.is_passed)
            pass_rate = (passed_count / len(completed_results)) * 100
        else:
            average_class_score = 0.0
            pass_rate = 0.0
        
        # Get active students (today and this week)
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        active_today = await TestResult.find(
            TestResult.instructor_id == instructor_id,
            TestResult.started_at >= today
        ).distinct("user_id")
        
        active_week = await TestResult.find(
            TestResult.instructor_id == instructor_id,
            TestResult.started_at >= week_ago
        ).distinct("user_id")
        
        # Get top performers and struggling students
        user_performance = {}
        for result in completed_results:
            user_id = result.user_id
            if user_id not in user_performance:
                user_performance[user_id] = []
            user_performance[user_id].append(result.percentage)
        
        user_averages = []
        for user_id, scores in user_performance.items():
            avg_score = sum(scores) / len(scores)
            user_averages.append({
                "user_id": user_id,
                "average_score": avg_score,
                "total_attempts": len(scores)
            })
        
        # Sort by average score
        user_averages.sort(key=lambda x: x["average_score"], reverse=True)
        
        top_performers = user_averages[:5]  # Top 5
        struggling_students = [u for u in user_averages if u["average_score"] < 60][-5:]  # Bottom 5 who are failing
        
        return InstructorStatsResponse(
            instructor_id=instructor_id,
            total_students=total_students,
            total_tests=total_tests,
            total_attempts=total_attempts,
            average_class_score=average_class_score,
            pass_rate=pass_rate,
            active_students_today=len(active_today),
            active_students_week=len(active_week),
            top_performers=top_performers,
            struggling_students=struggling_students,
            subject_performance=[]  # TODO: Implement subject-wise performance
        )
        
    except Exception as e:
        logger.error(f"Error getting instructor stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get instructor statistics"
        )

@router.get("/test/{test_id}/results", response_model=List[TestResultResponse])
async def get_test_results(
    test_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all results for a specific test (instructors only)"""
    try:
        if not (current_user.is_instructor or current_user.is_superuser):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only instructors can access test results"
            )
        
        results = await TestResult.find(
            TestResult.test_id == test_id,
            TestResult.status == "completed"
        ).sort(-TestResult.completed_at).to_list()
        
        return [
            TestResultResponse(
                id=str(result.id),
                user_id=result.user_id,
                test_id=result.test_id,
                test_title=result.test_title,
                subject_name=result.subject_name,
                total_questions=result.total_questions,
                answered_questions=result.answered_questions,
                correct_answers=result.correct_answers,
                total_points=result.total_points,
                earned_points=result.earned_points,
                percentage=result.percentage,
                grade=result.grade,
                time_taken=result.time_taken,
                time_limit=result.time_limit,
                status=result.status,
                is_passed=result.is_passed,
                attempt_number=result.attempt_number,
                started_at=result.started_at,
                completed_at=result.completed_at
            )
            for result in results
        ]
        
    except Exception as e:
        logger.error(f"Error getting test results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get test results"
        )

async def update_student_progress(user_id: str, test_result: TestResult):
    """Update student progress after test completion"""
    try:
        if not test_result.subject_id:
            return
        
        # Find or create progress record
        progress = await StudentProgress.find_one(
            StudentProgress.user_id == user_id,
            StudentProgress.subject_id == test_result.subject_id
        )
        
        if not progress:
            progress = StudentProgress(
                user_id=user_id,
                subject_id=test_result.subject_id,
                subject_name=test_result.subject_name or "Unknown Subject",
                instructor_id=test_result.instructor_id
            )
        
        # Update counters
        progress.total_tests += 1
        if test_result.status == "completed":
            progress.completed_tests += 1
            if test_result.is_passed:
                progress.passed_tests += 1
            else:
                progress.failed_tests += 1
        
        # Update scores
        if test_result.percentage > progress.best_score:
            progress.best_score = test_result.percentage
        
        progress.latest_score = test_result.percentage
        
        # Calculate average score
        all_results = await TestResult.find(
            TestResult.user_id == user_id,
            TestResult.subject_id == test_result.subject_id,
            TestResult.status == "completed"
        ).to_list()
        
        if all_results:
            total_score = sum(result.percentage for result in all_results)
            progress.average_score = total_score / len(all_results)
            
            # Calculate improvement trend (simple: latest vs average of previous)
            if len(all_results) > 1:
                previous_scores = [r.percentage for r in all_results[:-1]]
                previous_avg = sum(previous_scores) / len(previous_scores)
                progress.improvement_trend = test_result.percentage - previous_avg
        
        # Update timing
        progress.total_study_time += test_result.time_taken // 60  # Convert to minutes
        progress.average_test_time = progress.total_study_time / progress.completed_tests if progress.completed_tests > 0 else 0
        
        # Update activity tracking
        if not progress.first_attempt:
            progress.first_attempt = test_result.started_at
        progress.last_attempt = test_result.completed_at or datetime.utcnow()
        
        progress.updated_at = datetime.utcnow()
        await progress.save()
        
    except Exception as e:
        logger.error(f"Error updating student progress: {e}")

async def update_test_statistics(test_result: TestResult):
    """Update test statistics after test completion"""
    try:
        # Find or create statistics record
        stats = await TestStatistics.find_one(
            TestStatistics.test_id == test_result.test_id
        )
        
        if not stats:
            stats = TestStatistics(
                test_id=test_result.test_id,
                test_title=test_result.test_title,
                instructor_id=test_result.instructor_id or "",
                subject_id=test_result.subject_id
            )
        
        # Get all completed results for this test
        all_results = await TestResult.find(
            TestResult.test_id == test_result.test_id,
            TestResult.status == "completed"
        ).to_list()
        
        if all_results:
            scores = [result.percentage for result in all_results]
            
            # Update participation stats
            stats.total_attempts = len(all_results)
            stats.unique_students = len(set(result.user_id for result in all_results))
            stats.completed_attempts = len(all_results)
            
            # Update score statistics
            stats.average_score = sum(scores) / len(scores)
            stats.highest_score = max(scores)
            stats.lowest_score = min(scores)
            
            # Calculate median
            sorted_scores = sorted(scores)
            n = len(sorted_scores)
            if n % 2 == 0:
                stats.median_score = (sorted_scores[n//2-1] + sorted_scores[n//2]) / 2
            else:
                stats.median_score = sorted_scores[n//2]
            
            # Update pass/fail stats
            stats.passed_count = sum(1 for result in all_results if result.is_passed)
            stats.failed_count = len(all_results) - stats.passed_count
            stats.pass_rate = (stats.passed_count / len(all_results)) * 100
            
            # Update time statistics
            times = [result.time_taken / 60 for result in all_results]  # Convert to minutes
            stats.average_time = sum(times) / len(times)
            stats.fastest_time = min(times)
            stats.slowest_time = max(times)
        
        stats.last_calculated = datetime.utcnow()
        await stats.save()
        
    except Exception as e:
        logger.error(f"Error updating test statistics: {e}")
