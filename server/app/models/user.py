from sqlalchemy import Column, DateTime, Text, String, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from ..core.database import Base


class Profile(Base):
    """
    Stores additional metadata for Supabase auth.users.
    Mirrors auth.users UUID as primary key.
    """

    __tablename__ = "profiles"

    id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
        nullable=False,
        unique=True,
    )
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    username = Column(String, nullable=True, unique=True)
    student_code = Column(String, nullable=True, unique=True)
    extra_metadata = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
