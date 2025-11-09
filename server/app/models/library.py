from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Enum, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class DocumentType(str, enum.Enum):
    DOCUMENT = "document"
    PRESENTATION = "presentation"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class LibraryDocument(Base):
    __tablename__ = "library_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    subject_code = Column(String, nullable=True, index=True)
    subject_name = Column(String, nullable=True)
    document_type = Column(Enum(DocumentType), nullable=True)
    file_url = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    file_type = Column(String, nullable=True)  # File extension without dot
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String, nullable=True)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.DRAFT)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploader_name = Column(String, nullable=True)  # Denormalized
    author = Column(String, nullable=True)  # Author name
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Instructor who uploaded
    keywords = Column(JSON, nullable=True)  # Array of keywords
    semester = Column(String, nullable=True)
    academic_year = Column(String, nullable=True)
    chapter = Column(String, nullable=True)
    lesson = Column(String, nullable=True)
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)  # Average rating
    rating_count = Column(Integer, default=0)  # Number of ratings
    tags = Column(JSON, nullable=True)  # Array of tags
    document_metadata = Column(JSON, nullable=True)  # Additional metadata (renamed from metadata to avoid SQLAlchemy conflict)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    uploader = relationship("User", foreign_keys=[uploaded_by])
    instructor = relationship("User", foreign_keys=[instructor_id])


class LibrarySubject(Base):
    """Subject model for library (if not using organization.Subject)"""
    __tablename__ = "library_subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    credits = Column(Integer, nullable=True)
    department = Column(String, nullable=True)
    faculty = Column(String, nullable=True)
    prerequisite_subjects = Column(JSON, nullable=True)  # Array of subject codes
    primary_instructor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    instructors = Column(JSON, nullable=True)  # Array of instructor IDs
    total_documents = Column(Integer, default=0)
    total_students = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

