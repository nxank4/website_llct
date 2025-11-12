from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    test_id = Column(String, nullable=False, index=True)
    test_title = Column(String, nullable=True)
    subject_id = Column(String, nullable=True)
    subject_name = Column(String, nullable=True)
    total_questions = Column(Integer, default=0)
    answered_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    total_points = Column(Float, default=0.0)
    earned_points = Column(Float, default=0.0)
    percentage = Column(Float, default=0.0)
    grade = Column(String, nullable=True)  # A, B, C, D, F or custom
    time_limit = Column(Integer, nullable=True)  # Time limit in minutes
    time_taken = Column(Integer, default=0)  # Time taken in seconds
    status = Column(String, default="in_progress")  # in_progress, completed, abandoned
    is_passed = Column(Boolean, default=False)
    attempt_number = Column(Integer, default=1)
    max_attempts = Column(Integer, nullable=True)
    passing_score = Column(Float, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    answers = Column(JSON, nullable=True)  # Array of TestAnswer objects
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="TestResult.user_id==Profile.id",
        viewonly=True,
    )


class TestStatistics(Base):
    """Statistics for test results"""
    __tablename__ = "test_statistics"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(String, nullable=False, index=True)
    test_title = Column(String, nullable=True)
    instructor_id = Column(String, nullable=True)
    subject_id = Column(String, nullable=True, index=True)
    total_attempts = Column(Integer, default=0)
    completed_attempts = Column(Integer, default=0)
    unique_students = Column(Integer, default=0)
    average_score = Column(Float, default=0.0)
    median_score = Column(Float, default=0.0)
    highest_score = Column(Float, default=0.0)
    lowest_score = Column(Float, default=0.0)
    passed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    pass_rate = Column(Float, default=0.0)
    average_time = Column(Float, default=0.0)  # Average time in minutes
    fastest_time = Column(Float, default=0.0)  # Fastest time in minutes
    slowest_time = Column(Float, default=0.0)  # Slowest time in minutes
    last_calculated = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class StudentProgress(Base):
    """Student progress tracking"""
    __tablename__ = "student_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id = Column(String, nullable=True, index=True)
    subject_name = Column(String, nullable=True)
    instructor_id = Column(String, nullable=True)  # Instructor who created the test
    total_tests = Column(Integer, default=0)
    completed_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    average_score = Column(Float, default=0.0)
    best_score = Column(Float, default=0.0)
    latest_score = Column(Float, default=0.0)
    improvement_trend = Column(Float, default=0.0)  # Positive = improving, negative = declining
    total_study_time = Column(Integer, default=0)  # Total time in minutes
    average_test_time = Column(Float, default=0.0)  # Average time per test in minutes
    first_attempt = Column(DateTime(timezone=True), nullable=True)
    last_attempt = Column(DateTime(timezone=True), nullable=True)
    weak_topics = Column(JSON, nullable=True)  # Array of topics where student struggles
    strong_topics = Column(JSON, nullable=True)  # Array of topics where student excels
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="StudentProgress.user_id==Profile.id",
        viewonly=True,
    )

