"""
Assessment Results API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from fastapi.responses import StreamingResponse
from typing import List, Optional, cast
from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func as sql_func, distinct, delete
import csv
import io
import json

from ....models.assessment_result import AssessmentResult
from ....models.assessment import Assessment
from ....models.assessment_rating import AssessmentRating
from ....models.library import LibraryDocument, LibrarySubject
from ....schemas.library import LibraryDocumentResponse
from ....schemas.assessment_result import (
    AssessmentResultCreate,
    AssessmentResultResponse,
)
from ....core.database import get_db_session_write, get_db_session_read
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_supervisor_user,
    get_current_admin_user,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_admin(user: AuthenticatedUser) -> bool:
    return user.role == "admin"


def _is_supervisor(user: AuthenticatedUser) -> bool:
    return user.role in {"admin", "instructor"}


async def _ensure_instructor_access(
    assessment_id: str,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> None:
    """Raise 403 if instructor tries to access an assessment they do not own."""
    if _is_admin(current_user):
        return

    result = await db.execute(
        select(Assessment.id).where(Assessment.created_by == current_user.user_id)
    )
    owned_ids = result.scalars()
    owned_id_set = {str(pk) for pk in owned_ids}

    if assessment_id not in owned_id_set:
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền thao tác với bài kiểm tra này",
        )


@router.post("/", response_model=AssessmentResultResponse)
async def create_assessment_result(
    result_data: AssessmentResultCreate,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Create a new assessment result (student submits test)"""
    try:
        logger.info("Received result data for assessment %s", result_data.assessment_id)

        if result_data.student_id != current_user.user_id and not _is_supervisor(
            current_user
        ):
            raise HTTPException(
                status_code=403,
                detail="Bạn không thể nộp bài thay người dùng khác",
            )

        # For quick tests, assessment_id can be None
        # For regular tests, assessment_id is required
        if not result_data.is_quick_test and not result_data.assessment_id:
            raise HTTPException(
                status_code=400,
                detail="assessment_id is required for regular assessments",
            )

        # Check if this is a repeat attempt
        # For quick tests, count all quick test attempts for this student
        # For regular tests, count attempts for this specific assessment
        if result_data.is_quick_test:
            existing_count_query = select(sql_func.count(AssessmentResult.id)).where(
                and_(
                    AssessmentResult.student_id == result_data.student_id,
                    AssessmentResult.is_quick_test == True,
                )
            )
        else:
            existing_count_query = select(sql_func.count(AssessmentResult.id)).where(
                and_(
                    AssessmentResult.student_id == result_data.student_id,
                    AssessmentResult.assessment_id == result_data.assessment_id,
                )
            )
        result_count = await db.execute(existing_count_query)
        attempt_number = (result_count.scalar() or 0) + 1

        # Create new result
        result = AssessmentResult(
            student_id=result_data.student_id,
            student_name=result_data.student_name,
            assessment_id=result_data.assessment_id,  # Can be None for quick tests
            assessment_title=result_data.assessment_title or ("Kiểm tra nhanh" if result_data.is_quick_test else None),
            subject_code=result_data.subject_code,
            subject_name=result_data.subject_name,
            answers=result_data.answers,
            score=result_data.score,
            correct_answers=result_data.correct_answers,
            total_questions=result_data.total_questions,
            time_taken=result_data.time_taken,
            max_time=result_data.max_time,
            attempt_number=attempt_number,
            is_completed=True,
            completed_at=datetime.utcnow(),
            is_quick_test=result_data.is_quick_test,
        )

        db.add(result)
        await db.commit()
        await db.refresh(result)

        return AssessmentResultResponse.model_validate(result)

    except Exception as e:
        logger.error(f"Error saving result: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving result: {str(e)}")


@router.get("/student/{student_id}", response_model=List[AssessmentResultResponse])
async def get_student_results(
    student_id: UUID,
    subject_code: Optional[str] = Query(None),
    assessment_id: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get all results for a specific student"""
    try:
        # Check if user is requesting their own results or is admin/instructor
        if current_user.user_id != student_id and not _is_supervisor(current_user):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền xem kết quả của người dùng khác",
            )

        conditions = [AssessmentResult.student_id == student_id]

        if subject_code:
            conditions.append(AssessmentResult.subject_code == subject_code)
        if assessment_id:
            conditions.append(AssessmentResult.assessment_id == assessment_id)

        query = select(AssessmentResult).where(and_(*conditions))
        query = query.order_by(desc(AssessmentResult.completed_at))

        result = await db.execute(query)
        results = result.scalars().all()

        logger.info("Fetched %s results for student %s", len(results), student_id)
        return [AssessmentResultResponse.model_validate(r) for r in results]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error fetching results for student {student_id}: {str(e)}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy kết quả: {str(e)}")


@router.get("/student/{student_id}/attempt-number", response_model=dict)
async def get_attempt_number(
    student_id: UUID,
    assessment_id: str = Query(
        ..., description="Assessment ID to get attempt number for"
    ),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get the next attempt number for a student and assessment.
    Useful for displaying attempt number before submitting.

    - student_id: Student ID
    - assessment_id: Assessment ID
    """
    try:
        # Check if user is requesting their own attempt number or is admin/instructor
        if current_user.user_id != student_id and not _is_supervisor(current_user):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền xem attempt number của người dùng khác",
            )

        # Count existing results for this student and assessment
        count_query = select(sql_func.count(AssessmentResult.id)).where(
            and_(
                AssessmentResult.student_id == student_id,
                AssessmentResult.assessment_id == assessment_id,
            )
        )
        result_count = await db.execute(count_query)
        existing_count = result_count.scalar() or 0

        # Next attempt number is existing_count + 1
        next_attempt_number = existing_count + 1

        logger.info(
            f"Student {student_id} has {existing_count} existing attempts for assessment {assessment_id}. "
            f"Next attempt number: {next_attempt_number}"
        )

        return {
            "student_id": str(student_id),
            "assessment_id": assessment_id,
            "current_attempts": existing_count,
            "next_attempt_number": next_attempt_number,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting attempt number for student {student_id}, assessment {assessment_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=500, detail=f"Lỗi khi lấy attempt number: {str(e)}"
        )


@router.get(
    "/assessment/{assessment_id}", response_model=List[AssessmentResultResponse]
)
async def get_assessment_results(
    assessment_id: str,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get all results for a specific assessment (for instructors)"""
    try:
        # Only allow instructors/admins to view all results
        await _ensure_instructor_access(assessment_id, current_user, db)
        query = (
            select(AssessmentResult)
            .where(AssessmentResult.assessment_id == assessment_id)
            .order_by(desc(AssessmentResult.score))
        )

        result = await db.execute(query)
        results = result.scalars().all()

        return [AssessmentResultResponse.model_validate(r) for r in results]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching assessment results: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching assessment results: {str(e)}"
        )


@router.get("/statistics/{assessment_id}", response_model=dict)
async def get_assessment_statistics(
    assessment_id: str,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get statistics for a specific assessment"""
    try:
        # Only allow instructors/admins to view statistics
        await _ensure_instructor_access(assessment_id, current_user, db)
        query = select(AssessmentResult).where(
            AssessmentResult.assessment_id == assessment_id
        )

        result = await db.execute(query)
        results = result.scalars().all()

        if not results:
            return {
                "total_attempts": 0,
                "unique_students": 0,
                "average_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "pass_rate": 0,
            }

        scores: List[float] = []
        for record in results:
            value = cast(Optional[float], record.score)
            scores.append(float(value) if value is not None else 0.0)
        unique_students_query = select(
            sql_func.count(distinct(AssessmentResult.student_id))
        ).where(AssessmentResult.assessment_id == assessment_id)
        result_unique = await db.execute(unique_students_query)
        unique_students = result_unique.scalar() or 0
        passed = len([score for score in scores if score >= 60])

        return {
            "total_attempts": len(results),
            "unique_students": unique_students,
            "average_score": round(sum(scores) / len(scores), 2),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "pass_rate": round((passed / len(results)) * 100, 2) if results else 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching statistics: {str(e)}"
        )


@router.get("/student/{student_id}/export", response_class=StreamingResponse)
async def export_student_results(
    student_id: UUID,
    format: str = Query("csv", regex="^(csv|excel)$", description="Export format: csv or excel"),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Export student's assessment results to CSV or Excel"""
    try:
        # Check if user is requesting their own results or is admin/instructor
        if current_user.user_id != student_id and not _is_supervisor(current_user):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền xuất kết quả của người dùng khác",
            )

        # Get all results for this student
        query = select(AssessmentResult).where(
            AssessmentResult.student_id == student_id
        ).order_by(desc(AssessmentResult.completed_at))

        result = await db.execute(query)
        results = result.scalars().all()

        if not results:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy kết quả nào"
            )

        # Prepare data for export
        rows = []
        for r in results:
            # Parse answers to get question details
            answers = r.answers if r.answers else []
            question_details = []
            
            for idx, answer in enumerate(answers, 1):
                is_correct = answer.get("is_correct", False)
                user_answer = answer.get("user_answer", "")
                correct_answer = answer.get("correct_answer", "")
                question_details.append({
                    "question_number": idx,
                    "is_correct": "Đúng" if is_correct else "Sai",
                    "user_answer": str(user_answer),
                    "correct_answer": str(correct_answer),
                })

            # Create row for each result
            base_row = {
                "ID": r.id,
                "Tên sinh viên": r.student_name or "",
                "Mã bài kiểm tra": r.assessment_id,
                "Tên bài kiểm tra": r.assessment_title or "",
                "Mã môn học": r.subject_code or "",
                "Tên môn học": r.subject_name or "",
                "Điểm số": r.score,
                "Số câu đúng": r.correct_answers,
                "Tổng số câu": r.total_questions,
                "Số câu sai": r.total_questions - r.correct_answers,
                "Thời gian làm (giây)": r.time_taken,
                "Thời gian làm (phút)": round(r.time_taken / 60, 2) if r.time_taken else 0,
                "Lần làm": r.attempt_number,
                "Đã hoàn thành": "Có" if r.is_completed else "Không",
                "Ngày hoàn thành": r.completed_at.strftime("%Y-%m-%d %H:%M:%S") if r.completed_at else "",
            }
            
            # Add question details
            for q in question_details:
                base_row[f"Câu {q['question_number']} - Kết quả"] = q["is_correct"]
                base_row[f"Câu {q['question_number']} - Đáp án của bạn"] = q["user_answer"]
                base_row[f"Câu {q['question_number']} - Đáp án đúng"] = q["correct_answer"]
            
            rows.append(base_row)

        # Create CSV
        if format == "csv":
            output = io.StringIO()
            if rows:
                fieldnames = list(rows[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=ket_qua_kiem_tra_{student_id}.csv"
                }
            )
        else:
            # Excel format (using CSV with .xlsx extension for now, or can use openpyxl)
            # For now, return CSV with Excel-like formatting
            output = io.StringIO()
            if rows:
                fieldnames = list(rows[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=ket_qua_kiem_tra_{student_id}.csv"
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting student results: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi xuất kết quả: {str(e)}"
        )


@router.get("/assessment/{assessment_id}/export", response_class=StreamingResponse)
async def export_assessment_results(
    assessment_id: str,
    format: str = Query("csv", regex="^(csv|excel)$", description="Export format: csv or excel"),
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Export all results for an assessment to CSV or Excel (instructor/admin only)"""
    try:
        # Only allow instructors/admins to export assessment results
        await _ensure_instructor_access(assessment_id, current_user, db)
        
        query = select(AssessmentResult).where(
            AssessmentResult.assessment_id == assessment_id
        ).order_by(desc(AssessmentResult.score), desc(AssessmentResult.completed_at))

        result = await db.execute(query)
        results = result.scalars().all()

        if not results:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy kết quả nào"
            )

        # Prepare data for export
        rows = []
        for r in results:
            # Parse answers to get question details
            answers = r.answers if r.answers else []
            question_details = []
            
            for idx, answer in enumerate(answers, 1):
                is_correct = answer.get("is_correct", False)
                user_answer = answer.get("user_answer", "")
                correct_answer = answer.get("correct_answer", "")
                question_details.append({
                    "question_number": idx,
                    "is_correct": "Đúng" if is_correct else "Sai",
                    "user_answer": str(user_answer),
                    "correct_answer": str(correct_answer),
                })

            # Create row for each result
            base_row = {
                "ID": r.id,
                "Tên sinh viên": r.student_name or "",
                "Mã bài kiểm tra": r.assessment_id,
                "Tên bài kiểm tra": r.assessment_title or "",
                "Mã môn học": r.subject_code or "",
                "Tên môn học": r.subject_name or "",
                "Điểm số": r.score,
                "Số câu đúng": r.correct_answers,
                "Tổng số câu": r.total_questions,
                "Số câu sai": r.total_questions - r.correct_answers,
                "Thời gian làm (giây)": r.time_taken,
                "Thời gian làm (phút)": round(r.time_taken / 60, 2) if r.time_taken else 0,
                "Lần làm": r.attempt_number,
                "Đã hoàn thành": "Có" if r.is_completed else "Không",
                "Ngày hoàn thành": r.completed_at.strftime("%Y-%m-%d %H:%M:%S") if r.completed_at else "",
            }
            
            # Add question details
            for q in question_details:
                base_row[f"Câu {q['question_number']} - Kết quả"] = q["is_correct"]
                base_row[f"Câu {q['question_number']} - Đáp án của bạn"] = q["user_answer"]
                base_row[f"Câu {q['question_number']} - Đáp án đúng"] = q["correct_answer"]
            
            rows.append(base_row)

        # Create CSV
        if format == "csv":
            output = io.StringIO()
            if rows:
                fieldnames = list(rows[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=ket_qua_bai_kiem_tra_{assessment_id}.csv"
                }
            )
        else:
            # Excel format
            output = io.StringIO()
            if rows:
                fieldnames = list(rows[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=ket_qua_bai_kiem_tra_{assessment_id}.csv"
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting assessment results: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi xuất kết quả: {str(e)}"
        )


@router.get("/{result_id}", response_model=AssessmentResultResponse)
async def get_assessment_result(
    result_id: int,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get a specific assessment result by ID"""
    try:
        result = await db.execute(
            select(AssessmentResult).where(AssessmentResult.id == result_id)
        )
        assessment_result = result.scalar_one_or_none()
        
        if not assessment_result:
            raise HTTPException(status_code=404, detail="Kết quả không tồn tại")
        
        # Check if user has permission to view this result
        if (assessment_result.student_id != current_user.user_id and 
            not _is_supervisor(current_user)):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền xem kết quả này"
            )
        
        return AssessmentResultResponse.model_validate(assessment_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting assessment result: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lấy kết quả: {str(e)}"
        )


@router.delete("/{result_id}", response_model=dict)
async def delete_assessment_result(
    result_id: int,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Delete an assessment result (admin only)"""
    try:
        result_query = select(AssessmentResult).where(AssessmentResult.id == result_id)
        result = await db.execute(result_query)
        assessment_result = result.scalar_one_or_none()

        if not assessment_result:
            raise HTTPException(status_code=404, detail="Result not found")

        await db.execute(
            delete(AssessmentResult).where(AssessmentResult.id == result_id)
        )
        await db.commit()

        return {"message": "Assessment result deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting result: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting result: {str(e)}")


@router.get("/analytics/dashboard", response_model=dict)
async def get_dashboard_analytics(
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get comprehensive analytics data for the assessment dashboard.
    Returns:
    - score_distribution: Histogram data for score ranges
    - average_ratings: Average rating per assessment
    - low_performing_assessments: Top 5 assessments with lowest average scores
    - low_rated_assessments: Top 5 assessments with lowest ratings
    - hierarchical_data: Nested structure (Subject -> Chapter -> Assessment)
    """
    try:
        # Get all assessment results (excluding quick tests for main analytics)
        results_query = select(AssessmentResult).where(
            AssessmentResult.is_quick_test == False,
            AssessmentResult.is_completed == True,
        )
        results_result = await db.execute(results_query)
        all_results = results_result.scalars().all()

        # 1. Score Distribution (Histogram)
        score_ranges = {
            "0-2": 0,
            "2-4": 0,
            "4-6": 0,
            "6-8": 0,
            "8-10": 0,
        }
        for result in all_results:
            score = result.score or 0.0
            if score < 2:
                score_ranges["0-2"] += 1
            elif score < 4:
                score_ranges["2-4"] += 1
            elif score < 6:
                score_ranges["4-6"] += 1
            elif score < 8:
                score_ranges["6-8"] += 1
            else:
                score_ranges["8-10"] += 1

        score_distribution = [
            {"range": k, "count": v} for k, v in score_ranges.items()
        ]

        # 2. Average Ratings per Assessment
        # Get all assessments with their ratings
        assessments_query = select(Assessment)
        assessments_result = await db.execute(assessments_query)
        all_assessments = assessments_result.scalars().all()

        average_ratings = []
        for assessment in all_assessments:
            if assessment.rating_count and assessment.rating_count > 0:
                average_ratings.append({
                    "assessment_id": str(assessment.id),
                    "assessment_title": assessment.title,
                    "average_rating": round(assessment.rating or 0.0, 2),
                    "rating_count": assessment.rating_count,
                })

        # 3. Low Performing Assessments (lowest average scores)
        # Group results by assessment_id and calculate average scores
        assessment_scores: dict[str, list[float]] = {}
        for result in all_results:
            if result.assessment_id:
                if result.assessment_id not in assessment_scores:
                    assessment_scores[result.assessment_id] = []
                assessment_scores[result.assessment_id].append(result.score or 0.0)

        assessment_avg_scores = []
        for assessment_id, scores in assessment_scores.items():
            avg_score = sum(scores) / len(scores) if scores else 0.0
            # Get assessment title
            assessment = next(
                (a for a in all_assessments if str(a.id) == assessment_id), None
            )
            if assessment:
                assessment_avg_scores.append({
                    "assessment_id": assessment_id,
                    "assessment_title": assessment.title,
                    "average_score": round(avg_score, 2),
                    "attempt_count": len(scores),
                })

        # Sort by average score (ascending) and take top 5
        low_performing = sorted(
            assessment_avg_scores, key=lambda x: x["average_score"]
        )[:5]

        # 4. Low Rated Assessments (lowest ratings)
        low_rated = sorted(
            average_ratings, key=lambda x: x["average_rating"]
        )[:5]

        # 5. Hierarchical Data (Subject -> Chapter -> Assessment)
        # Group by subject_code
        subject_groups: dict[str, dict] = {}
        for result in all_results:
            if not result.subject_code:
                continue

            subject_code = result.subject_code
            if subject_code not in subject_groups:
                subject_groups[subject_code] = {
                    "subject_code": subject_code,
                    "subject_name": result.subject_name or subject_code,
                    "chapters": {},
                    "total_attempts": 0,
                    "total_score_sum": 0.0,
                    "result_count": 0,
                }

            subject_groups[subject_code]["total_attempts"] += 1
            subject_groups[subject_code]["total_score_sum"] += result.score or 0.0
            subject_groups[subject_code]["result_count"] += 1

            # Try to get chapter from assessment
            if result.assessment_id:
                assessment = next(
                    (a for a in all_assessments if str(a.id) == result.assessment_id),
                    None,
                )
                if assessment and assessment.subject_id:
                    # Get chapter from library documents for this subject
                    # We'll use subject_code to find chapters
                    chapter_key = "unknown"  # Default if no chapter found
                    chapter_title = "Chưa phân loại"

                    # Try to find chapter from library documents
                    # For now, we'll group by assessment_id as a proxy for chapter
                    # In a real implementation, you'd join with LibraryDocument
                    chapter_key = f"assessment_{result.assessment_id}"

                    if chapter_key not in subject_groups[subject_code]["chapters"]:
                        subject_groups[subject_code]["chapters"][chapter_key] = {
                            "chapter_number": None,
                            "chapter_title": chapter_title,
                            "assessments": {},
                            "total_attempts": 0,
                            "total_score_sum": 0.0,
                            "result_count": 0,
                        }

                    chapter = subject_groups[subject_code]["chapters"][chapter_key]
                    chapter["total_attempts"] += 1
                    chapter["total_score_sum"] += result.score or 0.0
                    chapter["result_count"] += 1

                    # Add assessment to chapter
                    if result.assessment_id not in chapter["assessments"]:
                        assessment_title = result.assessment_title or "Unknown"
                        chapter["assessments"][result.assessment_id] = {
                            "assessment_id": result.assessment_id,
                            "assessment_title": assessment_title,
                            "total_attempts": 0,
                            "total_score_sum": 0.0,
                            "result_count": 0,
                            "average_rating": 0.0,
                            "rating_count": 0,
                        }

                    assessment_data = chapter["assessments"][result.assessment_id]
                    assessment_data["total_attempts"] += 1
                    assessment_data["total_score_sum"] += result.score or 0.0
                    assessment_data["result_count"] += 1

                    # Get rating for this assessment
                    if assessment:
                        assessment_data["average_rating"] = round(
                            assessment.rating or 0.0, 2
                        )
                        assessment_data["rating_count"] = assessment.rating_count or 0

        # Convert hierarchical data to list format and calculate averages
        hierarchical_data = []
        for subject_code, subject_data in subject_groups.items():
            avg_score = (
                subject_data["total_score_sum"] / subject_data["result_count"]
                if subject_data["result_count"] > 0
                else 0.0
            )

            chapters_list = []
            for chapter_key, chapter_data in subject_data["chapters"].items():
                chapter_avg_score = (
                    chapter_data["total_score_sum"] / chapter_data["result_count"]
                    if chapter_data["result_count"] > 0
                    else 0.0
                )

                assessments_list = []
                for assessment_id, assessment_data in chapter_data[
                    "assessments"
                ].items():
                    assessment_avg_score = (
                        assessment_data["total_score_sum"]
                        / assessment_data["result_count"]
                        if assessment_data["result_count"] > 0
                        else 0.0
                    )

                    assessments_list.append({
                        "assessment_id": assessment_data["assessment_id"],
                        "assessment_title": assessment_data["assessment_title"],
                        "average_score": round(assessment_avg_score, 2),
                        "attempt_count": assessment_data["total_attempts"],
                        "average_rating": assessment_data["average_rating"],
                        "rating_count": assessment_data["rating_count"],
                    })

                chapters_list.append({
                    "chapter_number": chapter_data["chapter_number"],
                    "chapter_title": chapter_data["chapter_title"],
                    "average_score": round(chapter_avg_score, 2),
                    "attempt_count": chapter_data["total_attempts"],
                    "assessments": assessments_list,
                })

            hierarchical_data.append({
                "subject_code": subject_data["subject_code"],
                "subject_name": subject_data["subject_name"],
                "average_score": round(avg_score, 2),
                "attempt_count": subject_data["total_attempts"],
                "chapters": chapters_list,
            })

        # 6. Library Resources Analytics
        # Get all library documents
        documents_query = select(LibraryDocument).where(
            LibraryDocument.status == "published"
        )
        documents_result = await db.execute(documents_query)
        all_documents = documents_result.scalars().all()

        # Top 5 most viewed documents
        most_viewed = sorted(
            [
                {
                    "document_id": str(doc.id),
                    "document_title": doc.title,
                    "view_count": doc.view_count or 0,
                    "subject_name": doc.subject_name or "Unknown",
                }
                for doc in all_documents
            ],
            key=lambda x: x["view_count"],
            reverse=True,
        )[:5]

        # Top 5 highest rated documents
        highest_rated = sorted(
            [
                {
                    "document_id": str(doc.id),
                    "document_title": doc.title,
                    "average_rating": round(doc.rating or 0.0, 2),
                    "rating_count": doc.rating_count or 0,
                    "subject_name": doc.subject_name or "Unknown",
                }
                for doc in all_documents
                if doc.rating_count and doc.rating_count > 0
            ],
            key=lambda x: x["average_rating"],
            reverse=True,
        )[:5]

        # Top 5 lowest rated documents
        lowest_rated_docs = sorted(
            [
                {
                    "document_id": str(doc.id),
                    "document_title": doc.title,
                    "average_rating": round(doc.rating or 0.0, 2),
                    "rating_count": doc.rating_count or 0,
                    "subject_name": doc.subject_name or "Unknown",
                }
                for doc in all_documents
                if doc.rating_count and doc.rating_count > 0
            ],
            key=lambda x: x["average_rating"],
        )[:5]

        return {
            "score_distribution": score_distribution,
            "average_ratings": average_ratings,
            "low_performing_assessments": low_performing,
            "low_rated_assessments": low_rated,
            "hierarchical_data": hierarchical_data,
            "most_viewed_resources": most_viewed,
            "highest_rated_resources": highest_rated,
            "lowest_rated_resources": lowest_rated_docs,
        }

    except Exception as e:
        logger.error(f"Error fetching dashboard analytics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error fetching dashboard analytics: {str(e)}"
        )
