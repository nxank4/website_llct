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
