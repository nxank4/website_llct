from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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

router = APIRouter()


@router.get("/", response_model=List[AssessmentSchema])
def list_assessments(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return db.query(AssessmentModel).offset(skip).limit(limit).all()


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


