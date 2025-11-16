from sqlalchemy import Column, Integer, Float, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class AssessmentRating(Base):
    """Model for storing individual ratings of assessments by students"""
    __tablename__ = "assessment_ratings"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating = Column(Integer, nullable=False)  # 1-5 scale
    feedback = Column(Text, nullable=True)  # Optional feedback text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Unique constraint: one user can only rate one assessment once
    __table_args__ = (
        UniqueConstraint('assessment_id', 'user_id', name='uq_assessment_user_rating'),
    )

    # Relationships
    assessment = relationship("Assessment", foreign_keys=[assessment_id])
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="AssessmentRating.user_id==Profile.id",
        viewonly=True,
    )

