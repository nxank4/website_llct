from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    Enum,
    Float,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class DocumentType(str, enum.Enum):
    DOCUMENT = "document"
    TEXTBOOK = "textbook"
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
    # Use native_enum=True to match PostgreSQL native ENUM in database
    # values_callable forces SQLAlchemy to use enum values (not member names)
    document_type = Column(
        Enum(
            DocumentType,
            native_enum=True,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=True,
    )
    file_url = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    file_type = Column(String, nullable=True)  # File extension without dot
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String, nullable=True)
    # Use native_enum=True to match PostgreSQL native ENUM in database
    # values_callable forces SQLAlchemy to use enum values (not member names)
    status = Column(
        Enum(
            DocumentStatus,
            native_enum=True,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=DocumentStatus.DRAFT,
    )
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    uploader_name = Column(String, nullable=True)  # Denormalized
    author = Column(String, nullable=True)  # Author name
    instructor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
    )  # Instructor who uploaded
    semester = Column(String, nullable=True)
    academic_year = Column(String, nullable=True)
    chapter = Column(
        String, nullable=True
    )  # Legacy field, kept for backward compatibility
    chapter_number = Column(
        Integer, nullable=True, index=True
    )  # Số chương (1, 2, 3...)
    chapter_title = Column(String, nullable=True)  # Tiêu đề chương
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)  # Average rating
    rating_sum = Column(Integer, default=0)  # Sum of all ratings
    rating_count = Column(Integer, default=0)  # Number of ratings
    content_html = Column(Text, nullable=True)  # Rich text editor content (HTML/JSON)
    tags = Column(JSON, nullable=True)  # Array of tags
    document_metadata = Column(
        JSON, nullable=True
    )  # Additional metadata (renamed from metadata to avoid SQLAlchemy conflict)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    uploader = relationship(
        "Profile",
        foreign_keys=[uploaded_by],
        primaryjoin="LibraryDocument.uploaded_by==Profile.id",
        viewonly=True,
    )
    instructor = relationship(
        "Profile",
        foreign_keys=[instructor_id],
        primaryjoin="LibraryDocument.instructor_id==Profile.id",
        viewonly=True,
    )


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
    primary_instructor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    instructors = Column(JSON, nullable=True)  # Array of instructor IDs
    total_documents = Column(Integer, default=0)
    total_students = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
