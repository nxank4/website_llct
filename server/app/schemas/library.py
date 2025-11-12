from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from uuid import UUID


class DocumentType(str, Enum):
    DOCUMENT = "document"
    PRESENTATION = "presentation"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive"
    OTHER = "other"


class DocumentStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class LibraryDocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    document_type: Optional[DocumentType] = None
    file_url: Optional[str] = None
    tags: Optional[List[str]] = None
    status: DocumentStatus = DocumentStatus.DRAFT


class LibraryDocumentCreate(LibraryDocumentBase):
    pass


class LibraryDocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    document_type: Optional[DocumentType] = None
    file_url: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[DocumentStatus] = None


class LibraryDocumentResponse(LibraryDocumentBase):
    id: int
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    uploader_name: Optional[str] = None
    author: Optional[str] = None
    instructor_id: Optional[UUID] = None
    keywords: Optional[List[str]] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    chapter: Optional[str] = None
    lesson: Optional[str] = None
    download_count: int = 0
    view_count: int = 0
    rating: float = 0.0
    rating_count: int = 0
    document_metadata: Optional[dict] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubjectBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None


class SubjectResponse(SubjectBase):
    id: int
    credits: Optional[int] = None
    department: Optional[str] = None
    faculty: Optional[str] = None
    prerequisite_subjects: Optional[List[str]] = None
    primary_instructor_id: Optional[UUID] = None
    instructors: Optional[List[UUID]] = None
    total_documents: int = 0
    total_students: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

