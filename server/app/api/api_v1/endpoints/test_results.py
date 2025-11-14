import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from collections import defaultdict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func as sql_func, distinct

from ....models.test_result import TestResult, TestStatistics, StudentProgress
from ....schemas.test_result import (
    TestResultCreate,
    TestResultUpdate,
    TestResultResponse,
    StudentProgressResponse,
    InstructorStatsResponse,
    TestAnswer,
    StudentResultsSummaryResponse,
    StudentScoreTrendPoint,
    PrePostComparisonResponse,
)
from ....core.database import get_db_session_write, get_db_session_read
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_supervisor_user,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/start", response_model=TestResultResponse)
async def start_test(
    test_data: TestResultCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Start a new test attempt"""
    try:
        # Check if user has exceeded max attempts
        if test_data.max_attempts:
            count_query = select(sql_func.count(TestResult.id)).where(
                and_(
                    TestResult.user_id == current_user.user_id,
                    TestResult.test_id == test_data.test_id,
                )
            )
            result_count = await db.execute(count_query)
            existing_attempts = result_count.scalar() or 0

            if existing_attempts >= test_data.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Maximum attempts ({test_data.max_attempts}) exceeded",
                )

        # Get attempt number
        count_query = select(sql_func.count(TestResult.id)).where(
            and_(
                TestResult.user_id == current_user.user_id,
                TestResult.test_id == test_data.test_id,
            )
        )
        result_count = await db.execute(count_query)
        attempt_number = (result_count.scalar() or 0) + 1

        # Create new test result
        test_result = TestResult(
            user_id=current_user.user_id,
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
            user_agent=request.headers.get("user-agent"),
        )

        db.add(test_result)
        await db.commit()
        await db.refresh(test_result)

        return TestResultResponse.model_validate(test_result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting test: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start test",
        )


@router.put("/{result_id}/submit", response_model=TestResultResponse)
async def submit_test(
    result_id: int,
    test_update: TestResultUpdate,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Submit test answers and calculate score"""
    try:
        # Find test result
        result = await db.execute(select(TestResult).where(TestResult.id == result_id))
        test_result = result.scalar_one_or_none()

        if not test_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Test result not found"
            )

        # Verify ownership
        if test_result.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to submit this test",
            )

        # Calculate score
        correct_answers = 0
        earned_points = 0.0

        if test_update.answers:
            for answer in test_update.answers:
                if answer.is_correct:
                    correct_answers += 1
                    earned_points += answer.points_earned or 0.0

        percentage = (
            (earned_points / test_result.total_points) * 100
            if test_result.total_points > 0
            else 0
        )
        is_passed = percentage >= (test_result.passing_score or 0)

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
        if test_update.answers:
            test_result.answers = [answer.dict() for answer in test_update.answers]
        test_result.answered_questions = (
            len(test_update.answers) if test_update.answers else 0
        )
        test_result.correct_answers = correct_answers
        test_result.earned_points = earned_points
        test_result.percentage = percentage
        test_result.grade = grade
        if test_update.time_taken:
            test_result.time_taken = test_update.time_taken
        test_result.completed_at = datetime.utcnow()
        if test_update.status:
            test_result.status = test_update.status
        test_result.is_passed = is_passed

        await db.commit()
        await db.refresh(test_result)

        # Update student progress
        await update_student_progress(db, current_user.user_id, test_result)

        # Update test statistics
        await update_test_statistics(db, test_result)

        return TestResultResponse.model_validate(test_result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting test: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit test",
        )


@router.get("/my-results", response_model=List[TestResultResponse])
async def get_my_test_results(
    subject_id: Optional[str] = None,
    limit: int = 50,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get current user's test results"""
    try:
        query = select(TestResult).where(TestResult.user_id == current_user.user_id)

        if subject_id:
            query = query.where(TestResult.subject_id == subject_id)

        query = query.order_by(desc(TestResult.completed_at)).limit(limit)

        result = await db.execute(query)
        results = result.scalars().all()

        return [TestResultResponse.model_validate(r) for r in results]

    except Exception as e:
        logger.error(f"Error getting test results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get test results",
        )


@router.get("/my-progress", response_model=List[StudentProgressResponse])
async def get_my_progress(
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get current user's learning progress"""
    try:
        query = select(StudentProgress).where(
            StudentProgress.user_id == current_user.user_id
        )
        result = await db.execute(query)
        progress_records = result.scalars().all()

        return [
            StudentProgressResponse.model_validate(progress)
            for progress in progress_records
        ]

    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get progress",
        )


@router.get("/my-summary", response_model=StudentResultsSummaryResponse)
async def get_my_results_summary(
    subject_id: Optional[str] = Query(
        None, description="Chỉ tính các bài kiểm tra thuộc môn học này"
    ),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    try:
        filters = [TestResult.user_id == current_user.user_id]
        if subject_id:
            filters.append(TestResult.subject_id == subject_id)

        query = select(TestResult).where(and_(*filters))
        result = await db.execute(query)
        all_results = result.scalars().all()

        total_attempts = len(all_results)
        completed = [r for r in all_results if r.status == "completed"]
        passed = [r for r in completed if r.is_passed]

        average_score = (
            sum(r.percentage for r in completed) / len(completed)
            if completed
            else 0.0
        )
        best_score = max((r.percentage for r in completed), default=0.0)

        latest_completed = max(
            (r for r in completed if r.completed_at),
            key=lambda r: r.completed_at,
            default=None,
        )

        latest_score = latest_completed.percentage if latest_completed else None
        last_completed_at = (
            latest_completed.completed_at if latest_completed else None
        )

        total_study_time_minutes = int(
            sum((r.time_taken or 0) for r in completed) / 60
        )

        subjects_count = len(
            {
                r.subject_id
                for r in all_results
                if r.subject_id is not None and r.subject_id != ""
            }
        )

        return StudentResultsSummaryResponse(
            total_attempts=total_attempts,
            completed_attempts=len(completed),
            passed_attempts=len(passed),
            average_score=round(average_score, 2),
            best_score=round(best_score, 2),
            latest_score=round(latest_score, 2) if latest_score is not None else None,
            total_study_time_minutes=total_study_time_minutes,
            subjects_count=subjects_count,
            last_completed_at=last_completed_at,
        )

    except Exception as e:
        logger.error(f"Error getting student summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get summary",
        )


@router.get("/my-score-trend", response_model=List[StudentScoreTrendPoint])
async def get_my_score_trend(
    days: int = Query(30, ge=1, le=180, description="Số ngày gần nhất để lấy dữ liệu"),
    subject_id: Optional[str] = Query(None, description="Lọc theo môn học"),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    try:
        now = datetime.utcnow()
        start_time = now - timedelta(days=days)

        filters = [
            TestResult.user_id == current_user.user_id,
            TestResult.status == "completed",
            TestResult.completed_at.isnot(None),
            TestResult.completed_at >= start_time,
        ]
        if subject_id:
            filters.append(TestResult.subject_id == subject_id)

        query = select(TestResult).where(and_(*filters))
        result = await db.execute(query)
        completed_results = result.scalars().all()

        buckets: Dict[datetime.date, Dict[str, Any]] = defaultdict(
            lambda: {"scores": [], "attempts": 0, "passes": 0}
        )

        for record in completed_results:
            if not record.completed_at:
                continue
            day_key = record.completed_at.date()
            bucket = buckets[day_key]
            bucket["scores"].append(record.percentage)
            bucket["attempts"] += 1
            if record.is_passed:
                bucket["passes"] += 1

        points: List[StudentScoreTrendPoint] = []
        for day in sorted(buckets.keys()):
            bucket = buckets[day]
            avg = (
                sum(bucket["scores"]) / len(bucket["scores"])
                if bucket["scores"]
                else 0.0
            )
            points.append(
                StudentScoreTrendPoint(
                    date=day,
                    attempts=bucket["attempts"],
                    passed_attempts=bucket["passes"],
                    average_score=round(avg, 2),
                )
            )

        return points

    except Exception as e:
        logger.error(f"Error building score trend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get score trend",
        )


@router.get("/pre-post-comparison", response_model=PrePostComparisonResponse)
async def get_pre_post_comparison(
    pre_test_id: str = Query(..., description="ID bài kiểm tra Pre-test"),
    post_test_id: str = Query(..., description="ID bài kiểm tra Post-test"),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    try:
        async def _fetch_latest(test_id: str) -> Optional[TestResult]:
            query = (
                select(TestResult)
                .where(
                    and_(
                        TestResult.user_id == current_user.user_id,
                        TestResult.test_id == test_id,
                        TestResult.status == "completed",
                    )
                )
                .order_by(desc(TestResult.completed_at))
                .limit(1)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()

        pre_result, post_result = await asyncio.gather(
            _fetch_latest(pre_test_id), _fetch_latest(post_test_id)
        )

        improvement = None
        status = "missing"
        pre_score = pre_result.percentage if pre_result else None
        post_score = post_result.percentage if post_result else None

        if pre_score is not None and post_score is not None:
            improvement = post_score - pre_score
            if improvement > 0.5:
                status = "improved"
            elif improvement < -0.5:
                status = "declined"
            else:
                status = "no_change"
        elif post_score is not None:
            status = "post_only"
        elif pre_score is not None:
            status = "pre_only"

        return PrePostComparisonResponse(
            pre_test_id=pre_test_id,
            post_test_id=post_test_id,
            pre_score=pre_score,
            post_score=post_score,
            improvement=round(improvement, 2) if improvement is not None else None,
            status=status,
            pre_completed_at=pre_result.completed_at if pre_result else None,
            post_completed_at=post_result.completed_at if post_result else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing pre/post tests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compare pre/post tests",
        )


@router.get("/instructor-stats", response_model=InstructorStatsResponse)
async def get_instructor_stats(
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get instructor statistics (for instructors only)"""
    try:
        instructor_id = str(current_user.user_id)

        # Get basic stats - Note: TestResult doesn't have instructor_id field
        # This is a simplified version - you may need to adjust based on your actual schema
        total_tests_query = select(sql_func.count(TestResult.id))
        result_total = await db.execute(total_tests_query)
        total_tests = result_total.scalar() or 0

        completed_query = select(sql_func.count(TestResult.id)).where(
            TestResult.status == "completed"
        )
        result_completed = await db.execute(completed_query)
        total_attempts = result_completed.scalar() or 0

        # Get unique students
        unique_students_query = select(
            sql_func.count(distinct(TestResult.user_id))
        ).where(TestResult.status == "completed")
        result_unique = await db.execute(unique_students_query)
        total_students = result_unique.scalar() or 0

        # Get average score and pass rate
        completed_results_query = select(TestResult).where(
            TestResult.status == "completed"
        )
        result_completed_results = await db.execute(completed_results_query)
        completed_results = result_completed_results.scalars().all()

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

        active_today_query = select(distinct(TestResult.user_id)).where(
            TestResult.started_at >= today
        )
        result_today = await db.execute(active_today_query)
        active_today = result_today.scalars().all()

        active_week_query = select(distinct(TestResult.user_id)).where(
            TestResult.started_at >= week_ago
        )
        result_week = await db.execute(active_week_query)
        active_week = result_week.scalars().all()

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
            user_averages.append(
                {
                    "user_id": str(user_id),
                    "average_score": avg_score,
                    "total_attempts": len(scores),
                }
            )

        # Sort by average score
        user_averages.sort(key=lambda x: x["average_score"], reverse=True)

        top_performers = user_averages[:5]  # Top 5
        struggling_students = [u for u in user_averages if u["average_score"] < 60][
            -5:
        ]  # Bottom 5 who are failing

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
            subject_performance=[],  # TODO: Implement subject-wise performance
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting instructor stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get instructor statistics",
        )


@router.get("/test/{test_id}/results", response_model=List[TestResultResponse])
async def get_test_results(
    test_id: str,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get all results for a specific test (instructors only)"""
    try:
        query = (
            select(TestResult)
            .where(
                and_(TestResult.test_id == test_id, TestResult.status == "completed")
            )
            .order_by(desc(TestResult.completed_at))
        )

        result = await db.execute(query)
        results = result.scalars().all()

        return [TestResultResponse.model_validate(r) for r in results]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting test results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get test results",
        )


async def update_student_progress(
    db: AsyncSession, user_id: UUID, test_result: TestResult
):
    """Update student progress after test completion"""
    try:
        if not test_result.subject_id:
            return

        # Find or create progress record
        query = select(StudentProgress).where(
            and_(
                StudentProgress.user_id == user_id,
                StudentProgress.subject_id == test_result.subject_id,
            )
        )
        result = await db.execute(query)
        progress = result.scalar_one_or_none()

        if not progress:
            progress = StudentProgress(
                user_id=user_id,
                subject_id=test_result.subject_id,
                subject_name=test_result.subject_name or "Unknown Subject",
            )
            db.add(progress)

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
        all_results_query = select(TestResult).where(
            and_(
                TestResult.user_id == user_id,
                TestResult.subject_id == test_result.subject_id,
                TestResult.status == "completed",
            )
        )
        result_all = await db.execute(all_results_query)
        all_results = result_all.scalars().all()

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
        progress.average_test_time = (
            progress.total_study_time / progress.completed_tests
            if progress.completed_tests > 0
            else 0
        )

        # Update activity tracking
        if not progress.first_attempt:
            progress.first_attempt = test_result.started_at
        progress.last_attempt = test_result.completed_at or datetime.utcnow()

        await db.commit()
        await db.refresh(progress)

    except Exception as e:
        logger.error(f"Error updating student progress: {e}")
        await db.rollback()


async def update_test_statistics(db: AsyncSession, test_result: TestResult):
    """Update test statistics after test completion"""
    try:
        # Find or create statistics record
        query = select(TestStatistics).where(
            TestStatistics.test_id == test_result.test_id
        )
        result = await db.execute(query)
        stats = result.scalar_one_or_none()

        if not stats:
            stats = TestStatistics(
                test_id=test_result.test_id,
                test_title=test_result.test_title,
                subject_id=test_result.subject_id,
            )
            db.add(stats)

        # Get all completed results for this test
        all_results_query = select(TestResult).where(
            and_(
                TestResult.test_id == test_result.test_id,
                TestResult.status == "completed",
            )
        )
        result_all = await db.execute(all_results_query)
        all_results = result_all.scalars().all()

        if all_results:
            scores = [result.percentage for result in all_results]

            # Update participation stats
            stats.total_attempts = len(all_results)
            unique_students_query = select(
                sql_func.count(distinct(TestResult.user_id))
            ).where(
                and_(
                    TestResult.test_id == test_result.test_id,
                    TestResult.status == "completed",
                )
            )
            result_unique = await db.execute(unique_students_query)
            stats.unique_students = result_unique.scalar() or 0
            stats.completed_attempts = len(all_results)

            # Update score statistics
            stats.average_score = sum(scores) / len(scores)
            stats.highest_score = max(scores)
            stats.lowest_score = min(scores)

            # Calculate median
            sorted_scores = sorted(scores)
            n = len(sorted_scores)
            if n % 2 == 0:
                stats.median_score = (
                    sorted_scores[n // 2 - 1] + sorted_scores[n // 2]
                ) / 2
            else:
                stats.median_score = sorted_scores[n // 2]

            # Update pass/fail stats
            stats.passed_count = sum(1 for result in all_results if result.is_passed)
            stats.failed_count = len(all_results) - stats.passed_count
            stats.pass_rate = (stats.passed_count / len(all_results)) * 100

            # Update time statistics
            times = [
                result.time_taken / 60 for result in all_results
            ]  # Convert to minutes
            stats.average_time = sum(times) / len(times)
            stats.fastest_time = min(times)
            stats.slowest_time = max(times)

        stats.last_calculated = datetime.utcnow()
        await db.commit()
        await db.refresh(stats)

    except Exception as e:
        logger.error(f"Error updating test statistics: {e}")
        await db.rollback()
