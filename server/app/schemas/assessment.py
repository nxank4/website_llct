from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID


class AssessmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    assessment_type: Literal['pre_test','post_test','quiz','exam','assignment']
    subject_id: int
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None  # None hoặc 0 = không giới hạn, > 0 = giới hạn số lần
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
    created_by: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Assessment(AssessmentInDBBase):
    pass


class QuestionBase(BaseModel):
    question_text: str
    question_type: Literal['multiple_choice','essay','fill_in_blank']
    options: Optional[List[str]] = None  # For multiple choice: list of option texts
    correct_answer: str  # For single choice: option index/letter. For multiple: comma-separated indices. For essay: sample answer or empty.
    explanation: Optional[str] = None
    points: float = 1.0
    difficulty_level: int = 1
    tags: Optional[List[str]] = None
    # Extended fields for enhanced question types
    allow_multiple_selection: Optional[bool] = False  # For multiple_choice: allow selecting multiple options
    word_limit: Optional[int] = None  # For essay: maximum word count (None = unlimited)
    input_type: Optional[Literal['text', 'number']] = None  # For essay/fill_in_blank: expected input type


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[Literal['multiple_choice','essay','fill_in_blank']] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[float] = None
    difficulty_level: Optional[int] = None
    tags: Optional[List[str]] = None
    allow_multiple_selection: Optional[bool] = None
    word_limit: Optional[int] = None
    input_type: Optional[Literal['text', 'number']] = None


class QuestionInDBBase(QuestionBase):
    id: int
    assessment_id: int
    created_by: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Question(QuestionInDBBase):
    pass


