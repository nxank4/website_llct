from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from uuid import UUID


class UserRole(str, Enum):
    ADMIN = "admin"
    INSTRUCTOR = "instructor"
    STUDENT = "student"


class RoleUpdateRequest(BaseModel):
    """Request schema for updating user role"""

    role: str = Field(
        ..., description="Role to assign: 'admin', 'instructor', or 'student'"
    )

    class Config:
        json_schema_extra = {"example": {"role": "instructor"}}


class UserListResponse(BaseModel):
    """Response schema for user list"""

    id: UUID
    email: str
    username: str
    full_name: str
    is_active: bool
    is_superuser: bool
    is_instructor: bool
    email_verified: bool
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    role: Optional[str] = None  # Computed field: "admin", "instructor", or "student"
    total_assessments: int = 0  # Number of assessments created by instructor
    total_results: int = 0  # Number of test results for student

    class Config:
        from_attributes = True


class AIDataItemResponse(BaseModel):
    """Response schema for AI data item (GeminiFile)"""

    id: int
    title: str
    description: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None  # Gemini file name
    display_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    uploader_name: Optional[str] = None
    upload_date: Optional[datetime] = None
    last_processed: Optional[datetime] = None
    status: str  # "PENDING" | "INDEXING" | "COMPLETED" | "FAILED"
    status_text: str
    tags: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    indexed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AIDataUploadRequest(BaseModel):
    """Request schema for uploading AI file"""

    title: str = Field(..., description="File title")
    description: Optional[str] = Field(None, description="File description")
    subject_id: Optional[int] = Field(None, description="Subject ID")
    tags: Optional[List[str]] = Field(None, description="List of tags")


class AIDataStatsResponse(BaseModel):
    """Response schema for AI data statistics"""

    total_materials: int  # Alias for total_files (for frontend compatibility)
    processed_materials: int  # Alias for completed_files (for frontend compatibility)
    processing_materials: int  # Alias for indexing_files (for frontend compatibility)
    pending_materials: int  # Alias for pending_files (for frontend compatibility)
    failed_materials: int  # Alias for failed_files (for frontend compatibility)
    
    # Also include original field names for clarity
    total_files: int
    completed_files: int
    indexing_files: int
    pending_files: int
    failed_files: int
