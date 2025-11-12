from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_name = Column(String, nullable=True)
    assessment_id = Column(String, nullable=False, index=True)
    assessment_title = Column(String, nullable=True)
    subject_code = Column(String, nullable=True, index=True)
    subject_name = Column(String, nullable=True)
    answers = Column(JSON, nullable=True)  # Array of answers
    score = Column(Float, default=0.0)
    correct_answers = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    time_taken = Column(Integer, default=0)  # Time taken in seconds
    max_time = Column(Integer, nullable=True)  # Max time in seconds
    attempt_number = Column(Integer, default=1)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

