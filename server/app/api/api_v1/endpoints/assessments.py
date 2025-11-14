from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete
import random
import logging

from ....core.database import get_db_session_write, get_db_session_read
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_supervisor_user,
)
from ....models.assessment import Assessment as AssessmentModel, Question as QuestionModel, AssessmentType, QuestionType
from ....schemas.assessment import (
    Assessment as AssessmentSchema,
    AssessmentCreate,
    AssessmentUpdate,
    Question as QuestionSchema,
    QuestionCreate,
    QuestionUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[AssessmentSchema])
async def list_assessments(
    db: AsyncSession = Depends(get_db_session_read),
    skip: int = 0,
    limit: int = 100,
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    subject_code: Optional[str] = Query(None, description="Filter by subject code (requires Subject model)"),
    published_only: Optional[bool] = Query(None, description="Filter by published status"),
) -> Any:
    """
    List assessments with optional filters.
    
    - subject_id: Filter by subject ID
    - subject_code: Filter by subject code (if Subject model has code field)
    - published_only: Only return published assessments
    """
    query = select(AssessmentModel)
    
    conditions = []
    if subject_id:
        conditions.append(AssessmentModel.subject_id == subject_id)
    if published_only:
        conditions.append(AssessmentModel.is_published == True)
    
    # Note: subject_code filter would require joining with Subject model
    # For now, we'll filter by subject_id only
    # If Subject model exists with code field, we can add:
    # if subject_code:
    #     from ....models.subject import Subject
    #     query = query.join(Subject).where(Subject.code == subject_code)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=AssessmentSchema)
async def create_assessment(
    assessment_in: AssessmentCreate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    data = assessment_in.model_dump()
    # coerce enums
    data["assessment_type"] = AssessmentType(data["assessment_type"])
    data["created_by"] = current_user.user_id
    # Xử lý max_attempts: nếu là 0 hoặc None, thì lưu None (không giới hạn)
    if data.get("max_attempts") == 0:
        data["max_attempts"] = None
    assessment = AssessmentModel(**data)
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}", response_model=AssessmentSchema)
async def get_assessment(assessment_id: int, db: AsyncSession = Depends(get_db_session_read)) -> Any:
    result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.put("/{assessment_id}", response_model=AssessmentSchema)
async def update_assessment(
    assessment_id: int,
    assessment_in: AssessmentUpdate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    update_data = assessment_in.model_dump(exclude_unset=True)
    if "assessment_type" in update_data:
        update_data["assessment_type"] = AssessmentType(update_data["assessment_type"])
    for k, v in update_data.items():
        setattr(assessment, k, v)
    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}/questions", response_model=List[QuestionSchema])
async def list_questions(assessment_id: int, db: AsyncSession = Depends(get_db_session_read)) -> Any:
    result = await db.execute(select(QuestionModel).where(QuestionModel.assessment_id == assessment_id))
    return result.scalars().all()


@router.post("/{assessment_id}/questions", response_model=QuestionSchema)
async def create_question(
    assessment_id: int,
    question_in: QuestionCreate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    data = question_in.model_dump()
    data["question_type"] = QuestionType(data["question_type"])
    data["assessment_id"] = assessment_id
    data["created_by"] = current_user.user_id
    question = QuestionModel(**data)
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.get("/subject/{subject_id}/random-questions", response_model=List[QuestionSchema])
async def get_random_questions_from_subject(
    subject_id: int,
    count: int = Query(60, ge=1, le=100, description="Number of random questions to return"),
    db: AsyncSession = Depends(get_db_session_read),
) -> Any:
    """
    Get random questions from all assessments for a specific subject.
    Useful for creating quick tests.
    
    - subject_id: Subject ID to get questions from
    - count: Number of random questions to return (default: 60, max: 100)
    """
    try:
        # Get all published assessments for this subject
        assessments_query = select(AssessmentModel).where(
            and_(
                AssessmentModel.subject_id == subject_id,
                AssessmentModel.is_published == True
            )
        )
        assessments_result = await db.execute(assessments_query)
        assessments = assessments_result.scalars().all()
        
        if not assessments:
            logger.info(f"No published assessments found for subject_id: {subject_id}")
            return []
        
        # Get all questions from these assessments
        assessment_ids = [a.id for a in assessments]
        questions_query = select(QuestionModel).where(
            and_(
                QuestionModel.assessment_id.in_(assessment_ids),
                QuestionModel.is_active == True
            )
        )
        questions_result = await db.execute(questions_query)
        all_questions = questions_result.scalars().all()
        
        if not all_questions:
            logger.info(f"No questions found for subject_id: {subject_id}")
            return []
        
        # Randomly select questions
        selected_count = min(count, len(all_questions))
        selected_questions = random.sample(all_questions, selected_count)
        
        logger.info(
            f"Selected {selected_count} random questions from {len(all_questions)} total questions "
            f"for subject_id: {subject_id}"
        )
        
        return selected_questions
        
    except Exception as e:
        logger.error(f"Error getting random questions for subject_id {subject_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting random questions: {str(e)}"
        )


@router.delete("/{assessment_id}")
async def delete_assessment(
    assessment_id: int,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    """Delete an assessment and all its questions"""
    result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Cascade delete will handle questions automatically
    await db.execute(delete(AssessmentModel).where(AssessmentModel.id == assessment_id))
    await db.commit()
    return {"message": "Assessment deleted successfully"}


@router.put("/{assessment_id}/questions/{question_id}", response_model=QuestionSchema)
async def update_question(
    assessment_id: int,
    question_id: int,
    question_in: QuestionUpdate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    """Update a question"""
    # Verify assessment exists
    assessment_result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = assessment_result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get question
    question_result = await db.execute(select(QuestionModel).where(
        and_(QuestionModel.id == question_id, QuestionModel.assessment_id == assessment_id)
    ))
    question = question_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    update_data = question_in.model_dump(exclude_unset=True)
    if "question_type" in update_data:
        update_data["question_type"] = QuestionType(update_data["question_type"])
    
    for k, v in update_data.items():
        setattr(question, k, v)
    
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{assessment_id}/questions/{question_id}")
async def delete_question(
    assessment_id: int,
    question_id: int,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    """Delete a question"""
    # Verify assessment exists
    assessment_result = await db.execute(select(AssessmentModel).where(AssessmentModel.id == assessment_id))
    assessment = assessment_result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get question
    question_result = await db.execute(select(QuestionModel).where(
        and_(QuestionModel.id == question_id, QuestionModel.assessment_id == assessment_id)
    ))
    question = question_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db.execute(delete(QuestionModel).where(QuestionModel.id == question_id))
    await db.commit()
    return {"message": "Question deleted successfully"}


