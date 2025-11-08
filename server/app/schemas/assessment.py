from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime


class AssessmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    assessment_type: Literal['pre_test','post_test','quiz','exam','assignment']
    subject_id: int
    time_limit_minutes: Optional[int] = None
    max_attempts: int = 1
    is_published: bool = False
    is_randomized: bool = False


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assessment_type: Optional[Literal['pre_test','post_test','quiz','exam','assignment']] = None
    subject_id: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    is_published: Optional[bool] = None
    is_randomized: Optional[bool] = None


class AssessmentInDBBase(AssessmentBase):
    id: int
    created_by: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Assessment(AssessmentInDBBase):
    pass


class QuestionBase(BaseModel):
    question_text: str
    question_type: Literal['multiple_choice','true_false','essay','fill_in_blank']
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    points: float = 1.0
    difficulty_level: int = 1
    tags: Optional[List[str]] = None


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[Literal['multiple_choice','true_false','essay','fill_in_blank']] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[float] = None
    difficulty_level: Optional[int] = None
    tags: Optional[List[str]] = None


class QuestionInDBBase(QuestionBase):
    id: int
    assessment_id: int
    created_by: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Question(QuestionInDBBase):
    pass


