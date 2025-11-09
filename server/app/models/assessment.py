from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class AssessmentType(str, enum.Enum):
    PRE_TEST = "pre_test"
    POST_TEST = "post_test"
    QUIZ = "quiz"
    EXAM = "exam"
    ASSIGNMENT = "assignment"


class QuestionType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    FILL_IN_BLANK = "fill_in_blank"


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    assessment_type = Column(Enum(AssessmentType), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    time_limit_minutes = Column(Integer, nullable=True)
    max_attempts = Column(Integer, default=1)
    is_published = Column(Boolean, default=False)
    is_randomized = Column(Boolean, default=False)
    settings = Column(JSON, nullable=True)  # Additional assessment settings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subject = relationship("Subject", foreign_keys=[subject_id])
    creator = relationship("User")
    questions = relationship("Question", back_populates="assessment", cascade="all, delete-orphan")
    attempts = relationship("AssessmentAttempt", back_populates="assessment", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    options = Column(JSON, nullable=True)  # For multiple choice options
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    points = Column(Float, default=1.0)
    difficulty_level = Column(Integer, default=1)  # 1-5 scale
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    tags = Column(JSON, nullable=True)  # For categorization
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    creator = relationship("User")
    responses = relationship("QuestionResponse", back_populates="question", cascade="all, delete-orphan")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    attempt_number = Column(Integer, default=1)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    time_spent_minutes = Column(Integer, nullable=True)
    total_score = Column(Float, nullable=True)
    max_possible_score = Column(Float, nullable=True)
    is_completed = Column(Boolean, default=False)
    is_graded = Column(Boolean, default=False)

    # Relationships
    assessment = relationship("Assessment", back_populates="attempts")
    user = relationship("User")
    responses = relationship("QuestionResponse", back_populates="attempt", cascade="all, delete-orphan")


class QuestionResponse(Base):
    __tablename__ = "question_responses"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("assessment_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    attempt = relationship("AssessmentAttempt", back_populates="responses")
    question = relationship("Question", back_populates="responses")


class ItemBank(Base):
    __tablename__ = "item_bank"

    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    points = Column(Float, default=1.0)
    difficulty_level = Column(Integer, default=1)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    tags = Column(JSON, nullable=True)
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subject = relationship("Subject", foreign_keys=[subject_id])
    creator = relationship("User")
