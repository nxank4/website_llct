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


class MaterialType(str, enum.Enum):
    """Loại tài liệu"""

    BOOK = "book"  # Sách
    VIDEO = "video"  # Video
    SLIDE = "slide"  # Slide/Presentation
    DOCUMENT = "document"  # Tài liệu văn bản
    AUDIO = "audio"  # Audio
    IMAGE = "image"  # Hình ảnh
    OTHER = "other"  # Khác


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    content_html = Column(Text, nullable=True)  # Rich text editor content
    file_url = Column(String, nullable=True)
    file_type = Column(String, nullable=True)  # pdf, docx, video, etc.
    subject_id = Column(Integer, ForeignKey("library_subjects.id"), nullable=False)
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Link to library document chapter (for lectures to reference library chapters)
    chapter_number = Column(
        Integer, nullable=True, index=True
    )  # Số chương từ library (1, 2, 3...)
    chapter_title = Column(String, nullable=True)  # Tiêu đề chương từ library
    lesson_number = Column(
        Integer, nullable=True, index=True
    )  # Số bài học (1, 2, 3...)
    lesson_title = Column(String, nullable=True)  # Tiêu đề bài học
    material_type = Column(
        Enum(MaterialType), nullable=True
    )  # Loại tài liệu (sách, video, slide, ...)
    is_published = Column(Boolean, default=False)
    file_metadata = Column(JSON, nullable=True)  # For storing file metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subject = relationship("LibrarySubject", foreign_keys=[subject_id])
    uploader = relationship(
        "Profile",
        foreign_keys=[uploaded_by],
        primaryjoin="Material.uploaded_by==Profile.id",
        viewonly=True,
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("library_subjects.id"), nullable=False)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    due_date = Column(DateTime(timezone=True), nullable=True)
    max_points = Column(Float, default=100.0)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subject = relationship("LibrarySubject", foreign_keys=[subject_id])
    creator = relationship(
        "Profile",
        foreign_keys=[created_by],
        primaryjoin="Project.created_by==Profile.id",
        viewonly=True,
    )
    submissions = relationship(
        "ProjectSubmission", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectSubmission(Base):
    __tablename__ = "project_submissions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    graded_at = Column(DateTime(timezone=True), nullable=True)
    grade = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    project = relationship("Project", back_populates="submissions")
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="ProjectSubmission.user_id==Profile.id",
        viewonly=True,
    )
    grader = relationship(
        "Profile",
        foreign_keys=[graded_by],
        primaryjoin="ProjectSubmission.graded_by==Profile.id",
        viewonly=True,
    )


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    subject_id = Column(Integer, ForeignKey("library_subjects.id"), nullable=True)
    tags = Column(JSON, nullable=True)  # Array of tags
    is_published = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    author = relationship(
        "Profile",
        foreign_keys=[author_id],
        primaryjoin="Article.author_id==Profile.id",
        viewonly=True,
    )
    subject = relationship("LibrarySubject", foreign_keys=[subject_id])
