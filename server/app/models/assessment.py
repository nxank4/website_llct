from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Float,
    JSON,
    Enum,
)
from sqlalchemy.dialects.postgresql import UUID
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
    subject_id = Column(Integer, ForeignKey("library_subjects.id"), nullable=False)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    time_limit_minutes = Column(Integer, nullable=True)
    max_attempts = Column(Integer, nullable=True)  # None = không giới hạn, > 0 = giới hạn số lần
    is_published = Column(Boolean, default=False)
    is_randomized = Column(Boolean, default=False)
    settings = Column(JSON, nullable=True)  # Additional assessment settings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subject = relationship("LibrarySubject", foreign_keys=[subject_id])
    creator = relationship(
        "Profile",
        foreign_keys=[created_by],
        primaryjoin="Assessment.created_by==Profile.id",
        viewonly=True,
    )
    questions = relationship(
        "Question", back_populates="assessment", cascade="all, delete-orphan"
    )
    attempts = relationship(
        "AssessmentAttempt", back_populates="assessment", cascade="all, delete-orphan"
    )


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
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    tags = Column(JSON, nullable=True)  # For categorization
    is_active = Column(Boolean, default=True)
    # Extended fields for enhanced question types
    allow_multiple_selection = Column(Boolean, default=False)  # For multiple_choice: allow selecting multiple options
    word_limit = Column(Integer, nullable=True)  # For essay: maximum word count (None = unlimited)
    input_type = Column(String, nullable=True)  # For essay/fill_in_blank: 'text' or 'number'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    creator = relationship(
        "Profile",
        foreign_keys=[created_by],
        primaryjoin="Question.created_by==Profile.id",
        viewonly=True,
    )
    responses = relationship(
        "QuestionResponse", back_populates="question", cascade="all, delete-orphan"
    )


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
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
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="AssessmentAttempt.user_id==Profile.id",
        viewonly=True,
    )
    responses = relationship(
        "QuestionResponse", back_populates="attempt", cascade="all, delete-orphan"
    )


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
    subject_id = Column(Integer, ForeignKey("library_subjects.id"), nullable=False)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    tags = Column(JSON, nullable=True)
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subject = relationship("LibrarySubject", foreign_keys=[subject_id])
    creator = relationship(
        "Profile",
        foreign_keys=[created_by],
        primaryjoin="ItemBank.created_by==Profile.id",
        viewonly=True,
    )
