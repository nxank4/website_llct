from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
import random
import logging

from ....core.database import get_db
from ....middleware.auth import get_current_user
from ....models.user import User
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
def list_assessments(
    db: Session = Depends(get_db),
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
    
    result = db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=AssessmentSchema)
def create_assessment(
    assessment_in: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    data = assessment_in.model_dump()
    # coerce enums
    data["assessment_type"] = AssessmentType(data["assessment_type"])
    data["created_by"] = current_user.id
    assessment = AssessmentModel(**data)
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}", response_model=AssessmentSchema)
def get_assessment(assessment_id: int, db: Session = Depends(get_db)) -> Any:
    assessment = db.query(AssessmentModel).filter(AssessmentModel.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.put("/{assessment_id}", response_model=AssessmentSchema)
def update_assessment(
    assessment_id: int,
    assessment_in: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    assessment = db.query(AssessmentModel).filter(AssessmentModel.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    update_data = assessment_in.model_dump(exclude_unset=True)
    if "assessment_type" in update_data:
        update_data["assessment_type"] = AssessmentType(update_data["assessment_type"])
    for k, v in update_data.items():
        setattr(assessment, k, v)
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}/questions", response_model=List[QuestionSchema])
def list_questions(assessment_id: int, db: Session = Depends(get_db)) -> Any:
    return db.query(QuestionModel).filter(QuestionModel.assessment_id == assessment_id).all()


@router.post("/{assessment_id}/questions", response_model=QuestionSchema)
def create_question(
    assessment_id: int,
    question_in: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    assessment = db.query(AssessmentModel).filter(AssessmentModel.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    data = question_in.model_dump()
    data["question_type"] = QuestionType(data["question_type"])
    data["assessment_id"] = assessment_id
    data["created_by"] = current_user.id
    question = QuestionModel(**data)
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/subject/{subject_id}/random-questions", response_model=List[QuestionSchema])
def get_random_questions_from_subject(
    subject_id: int,
    count: int = Query(60, ge=1, le=100, description="Number of random questions to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
        assessments_result = db.execute(assessments_query)
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
        questions_result = db.execute(questions_query)
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


