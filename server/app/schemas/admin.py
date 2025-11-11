from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    INSTRUCTOR = "instructor"
    STUDENT = "student"


class RoleUpdateRequest(BaseModel):
    """Request schema for updating user role"""
    role: str = Field(..., description="Role to assign: 'admin', 'instructor', or 'student'")
    
    class Config:
        json_schema_extra = {
            "example": {
                "role": "instructor"
            }
        }


class UserListResponse(BaseModel):
    """Response schema for user list"""
    id: int
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
    """Response schema for AI data item (Material with embeddings)"""
    id: int
    title: str
    description: Optional[str] = None
    file_type: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    subject_id: int
    subject_name: Optional[str] = None
    uploaded_by: int
    uploader_name: Optional[str] = None
    upload_date: Optional[datetime] = None
    last_processed: Optional[datetime] = None
    status: str  # "PENDING" | "INDEXING" | "COMPLETED" | "FAILED"
    status_text: str
    embeddings_count: int = 0
    chunks_count: int = 0
    usage_count: int = 0
    tags: Optional[List[str]] = None
    is_published: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AIDataStatsResponse(BaseModel):
    """Response schema for AI data statistics"""
    total_materials: int
    processed_materials: int
    processing_materials: int
    failed_materials: int
    total_embeddings: int
    total_chunks: int
    total_usage: int
