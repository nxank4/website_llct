from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Float,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    instructor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    category = Column(String, nullable=False)
    level = Column(String, nullable=False)  # beginner, intermediate, advanced
    price = Column(Float, default=0.0)
    thumbnail_url = Column(String, nullable=True)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    instructor = relationship(
        "Profile",
        foreign_keys=[instructor_id],
        primaryjoin="Course.instructor_id==Profile.id",
        viewonly=True,
    )
    lessons = relationship(
        "Lesson", back_populates="course", cascade="all, delete-orphan"
    )
    enrollments = relationship(
        "Enrollment", back_populates="course", cascade="all, delete-orphan"
    )


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    video_url = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=0)
    order_index = Column(Integer, default=0)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    course = relationship("Course", back_populates="lessons")
    exercises = relationship(
        "Exercise", back_populates="lesson", cascade="all, delete-orphan"
    )


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    question = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    points = Column(Integer, default=1)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    lesson = relationship("Lesson", back_populates="exercises")
    submissions = relationship(
        "ExerciseSubmission", back_populates="exercise", cascade="all, delete-orphan"
    )


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    progress_percentage = Column(Float, default=0.0)

    # Relationships
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="Enrollment.user_id==Profile.id",
        viewonly=True,
    )
    course = relationship("Course", back_populates="enrollments")


class ExerciseSubmission(Base):
    __tablename__ = "exercise_submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="ExerciseSubmission.user_id==Profile.id",
        viewonly=True,
    )
    exercise = relationship("Exercise", back_populates="submissions")
