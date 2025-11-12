from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class AssessmentResultCreate(BaseModel):
    student_id: UUID
    student_name: Optional[str] = None
    assessment_id: str
    assessment_title: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    answers: Optional[List[Dict[str, Any]]] = None
    score: float = 0.0
    correct_answers: int = 0
    total_questions: int = 0
    time_taken: int = 0
    max_time: Optional[int] = None


class AssessmentResultResponse(BaseModel):
    id: int
    student_id: UUID
    student_name: Optional[str] = None
    assessment_id: str
    assessment_title: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    answers: Optional[List[Dict[str, Any]]] = None
    score: float = 0.0
    correct_answers: int = 0
    total_questions: int = 0
    time_taken: int = 0
    max_time: Optional[int] = None
    attempt_number: int = 1
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

