"""
Assessment Results API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from beanie import PydanticObjectId
from datetime import datetime

from app.models.mongodb_models import (
    AssessmentResult, 
    AssessmentResultCreate,
    User
)
from app.api.api_v1.endpoints.mongodb_auth import get_current_user

router = APIRouter()

@router.post("/", response_model=dict)
async def create_assessment_result(
    result_data: AssessmentResultCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new assessment result (student submits test)"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Received result data: {result_data}")
        logger.info(f"Current user: {current_user.email if current_user else 'None'}")
        # Check if this is a repeat attempt
        existing_results = await AssessmentResult.find(
            AssessmentResult.student_id == result_data.student_id,
            AssessmentResult.assessment_id == result_data.assessment_id
        ).to_list()
        
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
            completed_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        
        await result.insert()
        
        return {
            "message": "Assessment result saved successfully",
            "result_id": str(result.id),
            "attempt_number": attempt_number,
            "score": result_data.score
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving result: {str(e)}")

@router.get("/student/{student_id}", response_model=List[dict])
async def get_student_results(
    student_id: str,
    subject_code: Optional[str] = Query(None),
    assessment_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get all results for a specific student"""
    try:
        query_filters = [AssessmentResult.student_id == student_id]
        
        if subject_code:
            query_filters.append(AssessmentResult.subject_code == subject_code)
        if assessment_id:
            query_filters.append(AssessmentResult.assessment_id == assessment_id)
        
        results = await AssessmentResult.find(*query_filters).sort(-AssessmentResult.completed_at).to_list()
        
        return [
            {
                "id": str(result.id),
                "assessment_id": result.assessment_id,
                "assessment_title": result.assessment_title,
                "subject_code": result.subject_code,
                "subject_name": result.subject_name,
                "score": result.score,
                "correct_answers": result.correct_answers,
                "total_questions": result.total_questions,
                "time_taken": result.time_taken,
                "attempt_number": result.attempt_number,
                "completed_at": result.completed_at.isoformat(),
                "grade": "Xuất sắc" if result.score >= 80 else "Đạt" if result.score >= 60 else "Chưa đạt"
            }
            for result in results
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching results: {str(e)}")

@router.get("/assessment/{assessment_id}", response_model=List[dict])
async def get_assessment_results(
    assessment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all results for a specific assessment (for instructors)"""
    try:
        # Only allow instructors/admins to view all results
        if current_user.role not in ["instructor", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized to view assessment results")
        
        results = await AssessmentResult.find(
            AssessmentResult.assessment_id == assessment_id
        ).sort(-AssessmentResult.score).to_list()
        
        return [
            {
                "id": str(result.id),
                "student_id": result.student_id,
                "student_name": result.student_name,
                "score": result.score,
                "correct_answers": result.correct_answers,
                "total_questions": result.total_questions,
                "time_taken": result.time_taken,
                "attempt_number": result.attempt_number,
                "completed_at": result.completed_at.isoformat(),
                "grade": "Xuất sắc" if result.score >= 80 else "Đạt" if result.score >= 60 else "Chưa đạt"
            }
            for result in results
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching assessment results: {str(e)}")

@router.get("/statistics/{assessment_id}", response_model=dict)
async def get_assessment_statistics(
    assessment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get statistics for a specific assessment"""
    try:
        # Only allow instructors/admins to view statistics
        if current_user.role not in ["instructor", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized to view statistics")
        
        results = await AssessmentResult.find(
            AssessmentResult.assessment_id == assessment_id
        ).to_list()
        
        if not results:
            return {
                "total_attempts": 0,
                "unique_students": 0,
                "average_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "pass_rate": 0
            }
        
        scores = [result.score for result in results]
        unique_students = len(set(result.student_id for result in results))
        passed = len([score for score in scores if score >= 60])
        
        return {
            "total_attempts": len(results),
            "unique_students": unique_students,
            "average_score": round(sum(scores) / len(scores), 2),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "pass_rate": round((passed / len(results)) * 100, 2) if results else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching statistics: {str(e)}")

@router.delete("/{result_id}", response_model=dict)
async def delete_assessment_result(
    result_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an assessment result (admin only)"""
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete results")
        
        result = await AssessmentResult.get(PydanticObjectId(result_id))
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        await result.delete()
        
        return {"message": "Assessment result deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting result: {str(e)}")
