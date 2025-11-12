from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    level: str
    price: float = 0.0
    thumbnail_url: Optional[str] = None
    is_published: bool = False


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    price: Optional[float] = None
    thumbnail_url: Optional[str] = None
    is_published: Optional[bool] = None


class CourseInDBBase(CourseBase):
    id: int
    instructor_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Course(CourseInDBBase):
    pass


class CourseWithInstructor(Course):
    instructor: "User"


class LessonBase(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: int = 0
    order_index: int = 0
    is_published: bool = False


class LessonCreate(LessonBase):
    course_id: int


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None


class LessonInDBBase(LessonBase):
    id: int
    course_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Lesson(LessonInDBBase):
    pass


class ExerciseBase(BaseModel):
    title: str
    description: Optional[str] = None
    question: str
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1


class ExerciseCreate(ExerciseBase):
    lesson_id: int


class ExerciseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    question: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[int] = None


class ExerciseInDBBase(ExerciseBase):
    id: int
    lesson_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Exercise(ExerciseInDBBase):
    pass


class EnrollmentBase(BaseModel):
    user_id: UUID
    course_id: int


class EnrollmentCreate(EnrollmentBase):
    pass


class EnrollmentInDBBase(EnrollmentBase):
    id: int
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    progress_percentage: float = 0.0

    class Config:
        from_attributes = True


class Enrollment(EnrollmentInDBBase):
    pass


class ExerciseSubmissionBase(BaseModel):
    user_id: UUID
    exercise_id: int
    answer: str


class ExerciseSubmissionCreate(ExerciseSubmissionBase):
    pass


class ExerciseSubmissionInDBBase(ExerciseSubmissionBase):
    id: int
    is_correct: bool
    submitted_at: datetime

    class Config:
        from_attributes = True


class ExerciseSubmission(ExerciseSubmissionInDBBase):
    pass


class SubjectBase(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None


class Subject(SubjectBase):
    pass


# Update forward references
from .user import User

CourseWithInstructor.model_rebuild()
