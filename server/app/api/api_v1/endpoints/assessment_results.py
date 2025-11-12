"""
Assessment Results API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, cast
from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func as sql_func, distinct, delete

from ....models.assessment_result import AssessmentResult
from ....models.assessment import Assessment
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
    return user.role in {"admin", "supervisor", "instructor"}


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

        # Check if this is a repeat attempt
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
            assessment_id=result_data.assessment_id,
            assessment_title=result_data.assessment_title,
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
