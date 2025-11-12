from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class TestAnswer(BaseModel):
    question_id: str
    answer: Any
    is_correct: Optional[bool] = None
    points_earned: Optional[float] = None


class TestResultBase(BaseModel):
    test_id: str
    test_title: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    total_questions: int = 0
    time_limit: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score: Optional[float] = None


class TestResultCreate(TestResultBase):
    pass


class TestResultUpdate(BaseModel):
    test_title: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    total_questions: Optional[int] = None
    answered_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    total_points: Optional[float] = None
    earned_points: Optional[float] = None
    percentage: Optional[float] = None
    grade: Optional[str] = None
    time_limit: Optional[int] = None
    time_taken: Optional[int] = None
    status: Optional[str] = None
    is_passed: Optional[bool] = None
    attempt_number: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score: Optional[float] = None
    answers: Optional[List[TestAnswer]] = None
    completed_at: Optional[datetime] = None


class TestResultResponse(BaseModel):
    id: int
    user_id: UUID
    test_id: str
    test_title: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    total_questions: int = 0
    answered_questions: int = 0
    correct_answers: int = 0
    total_points: float = 0.0
    earned_points: float = 0.0
    percentage: float = 0.0
    grade: Optional[str] = None
    time_limit: Optional[int] = None
    time_taken: int = 0
    status: str = "in_progress"
    is_passed: bool = False
    attempt_number: int = 1
    max_attempts: Optional[int] = None
    passing_score: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    answers: Optional[List[TestAnswer]] = None

    class Config:
        from_attributes = True


class StudentProgressResponse(BaseModel):
    id: int
    user_id: UUID
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    total_tests: int = 0
    completed_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    average_score: float = 0.0
    best_score: float = 0.0
    latest_score: float = 0.0
    improvement_trend: float = 0.0
    total_study_time: int = 0
    average_test_time: float = 0.0
    first_attempt: Optional[datetime] = None
    last_attempt: Optional[datetime] = None
    weak_topics: Optional[List[str]] = None
    strong_topics: Optional[List[str]] = None

    class Config:
        from_attributes = True


class InstructorStatsResponse(BaseModel):
    instructor_id: str
    total_students: int
    total_tests: int
    total_attempts: int
    average_class_score: float
    pass_rate: float
    active_students_today: int
    active_students_week: int
    top_performers: List[Dict[str, Any]]
    struggling_students: List[Dict[str, Any]]
    subject_performance: List[Dict[str, Any]]

