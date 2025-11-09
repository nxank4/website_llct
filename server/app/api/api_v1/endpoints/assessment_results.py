"""
Assessment Results API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, desc, func as sql_func, distinct

from ....models.assessment_result import AssessmentResult
from ....models.user import User
from ....schemas.assessment_result import AssessmentResultCreate, AssessmentResultResponse
from ....core.database import get_db
from ....middleware.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=AssessmentResultResponse)
async def create_assessment_result(
    result_data: AssessmentResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new assessment result (student submits test)"""
    try:
        logger.info(f"Received result data: {result_data}")
        logger.info(f"Current user: {current_user.email if current_user else 'None'}")
        
        # Check if this is a repeat attempt
        existing_query = select(AssessmentResult).where(
            and_(
                AssessmentResult.student_id == result_data.student_id,
                AssessmentResult.assessment_id == result_data.assessment_id
            )
        )
        existing_results = db.execute(existing_query).scalars().all()
        
        attempt_number = len(existing_results) + 1
        
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
            completed_at=datetime.utcnow()
        )
        
        db.add(result)
        db.commit()
        db.refresh(result)
        
        return AssessmentResultResponse.model_validate(result)
        
    except Exception as e:
        logger.error(f"Error saving result: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving result: {str(e)}")

@router.get("/student/{student_id}", response_model=List[AssessmentResultResponse])
async def get_student_results(
    student_id: str,
    subject_code: Optional[str] = Query(None),
    assessment_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all results for a specific student"""
    try:
        query = select(AssessmentResult).where(
            AssessmentResult.student_id == student_id
        )
        
        conditions = [AssessmentResult.student_id == student_id]
        
        if subject_code:
            conditions.append(AssessmentResult.subject_code == subject_code)
        if assessment_id:
            conditions.append(AssessmentResult.assessment_id == assessment_id)
        
        query = select(AssessmentResult).where(and_(*conditions))
        query = query.order_by(desc(AssessmentResult.completed_at))
        
        result = db.execute(query)
        results = result.scalars().all()
        
        return [AssessmentResultResponse.model_validate(r) for r in results]
        
    except Exception as e:
        logger.error(f"Error fetching results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching results: {str(e)}")

@router.get("/assessment/{assessment_id}", response_model=List[AssessmentResultResponse])
async def get_assessment_results(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all results for a specific assessment (for instructors)"""
    try:
        # Only allow instructors/admins to view all results
        if not (current_user.is_instructor or current_user.is_superuser):
            raise HTTPException(status_code=403, detail="Not authorized to view assessment results")
        
        query = select(AssessmentResult).where(
            AssessmentResult.assessment_id == assessment_id
        ).order_by(desc(AssessmentResult.score))
        
        result = db.execute(query)
        results = result.scalars().all()
        
        return [AssessmentResultResponse.model_validate(r) for r in results]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching assessment results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching assessment results: {str(e)}")

@router.get("/statistics/{assessment_id}", response_model=dict)
async def get_assessment_statistics(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for a specific assessment"""
    try:
        # Only allow instructors/admins to view statistics
        if not (current_user.is_instructor or current_user.is_superuser):
            raise HTTPException(status_code=403, detail="Not authorized to view statistics")
        
        query = select(AssessmentResult).where(
            AssessmentResult.assessment_id == assessment_id
        )
        result = db.execute(query)
        results = result.scalars().all()
        
        if not results:
            return {
                "total_attempts": 0,
                "unique_students": 0,
                "average_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "pass_rate": 0
            }
        
        scores = [r.score for r in results]
        unique_students_query = select(sql_func.count(distinct(AssessmentResult.student_id))).where(
            AssessmentResult.assessment_id == assessment_id
        )
        unique_students = db.execute(unique_students_query).scalar() or 0
        passed = len([score for score in scores if score >= 60])
        
        return {
            "total_attempts": len(results),
            "unique_students": unique_students,
            "average_score": round(sum(scores) / len(scores), 2),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "pass_rate": round((passed / len(results)) * 100, 2) if results else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching statistics: {str(e)}")

@router.delete("/{result_id}", response_model=dict)
async def delete_assessment_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an assessment result (admin only)"""
    try:
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Only admins can delete results")
        
        result_query = select(AssessmentResult).where(AssessmentResult.id == result_id)
        result = db.execute(result_query).scalar_one_or_none()
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        db.delete(result)
        db.commit()
        
        return {"message": "Assessment result deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting result: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting result: {str(e)}")
