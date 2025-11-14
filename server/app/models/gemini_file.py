"""
Gemini File Model for AI Server Integration

This model stores metadata about files uploaded to Gemini File Search Store.
The actual files are stored in Google's File Search Store, but we track
metadata (title, description, status, etc.) in our database.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class FileSearchStatus(str, enum.Enum):
    """Status of file in Gemini File Search Store"""
    PENDING = "PENDING"  # File metadata created, not yet uploaded
    INDEXING = "INDEXING"  # File uploaded, being indexed by Gemini
    COMPLETED = "COMPLETED"  # File indexed and ready for search
    FAILED = "FAILED"  # Upload or indexing failed


class GeminiFile(Base):
    __tablename__ = "gemini_files"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # File information
    file_name = Column(String, nullable=True)  # Gemini file name (e.g., "files/abc123")
    display_name = Column(String, nullable=True)  # Display name in File Search Store
    file_type = Column(String, nullable=True)  # File extension (pdf, docx, etc.)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String, nullable=True)
    
    # Subject/Category
    subject_id = Column(Integer, ForeignKey("library_subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Status tracking
    status = Column(Enum(FileSearchStatus), default=FileSearchStatus.PENDING, nullable=False, index=True)
    operation_name = Column(String, nullable=True)  # Long-running operation name from Gemini
    
    # Metadata
    tags = Column(JSON, nullable=True)  # Array of tags
    gemini_metadata = Column(JSON, nullable=True)  # Additional metadata from Gemini API
    
    # Tracking
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    uploader_name = Column(String, nullable=True)  # Denormalized
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    indexed_at = Column(DateTime(timezone=True), nullable=True)  # When indexing completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    uploader = relationship(
        "Profile",
        foreign_keys=[uploaded_by],
        primaryjoin="GeminiFile.uploaded_by==Profile.id",
        viewonly=True,
    )
    subject = relationship(
        "LibrarySubject",
        foreign_keys=[subject_id],
        viewonly=True,
    )

