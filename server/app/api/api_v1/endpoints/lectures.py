"""
Lectures API endpoints for managing course lectures/materials
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, cast, String, delete
from pathlib import Path
import uuid
import aiofiles
import logging
from uuid import UUID

from ....core.database import get_db_session_write, get_db_session_read
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_supervisor_user,
    get_current_user_profile,
)
from ....models.user import Profile
from ....models.content import Material
from ....models.organization import Subject
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

# File upload configuration for lectures
LECTURE_UPLOAD_DIR = Path("uploads/lectures")
LECTURE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

LECTURE_ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.ppt', '.pptx',  # Documents
    '.mp4', '.avi', '.mov', '.webm',  # Videos
    '.mp3', '.wav',  # Audio
    '.jpg', '.jpeg', '.png',  # Images
}

LECTURE_MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB


class LectureResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    uploaded_by: UUID
    uploader_name: Optional[str] = None
    duration: Optional[str] = None
    is_published: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class LectureCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: int
    is_published: bool = False


@router.get("/", response_model=List[LectureResponse])
async def list_lectures(
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    published_only: Optional[bool] = Query(None, description="Filter by published status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get list of lectures (materials with type=lecture)
    
    Args:
        subject_id: Filter by subject ID
        published_only: Filter by published status
        skip: Number of items to skip
        limit: Number of items to return
        db: Database session
        current_user: Current user
    
    Returns:
        List of lectures
    """
    try:
        # Build query - filter materials that are lectures
        # We'll use file_metadata to identify lectures, or check if it's not RAG material
        query = select(Material).join(Subject, Material.subject_id == Subject.id)
        
        # Filter by subject if provided
        if subject_id:
            query = query.where(Material.subject_id == subject_id)
        
        # Filter by published status
        if published_only is not None:
            query = query.where(Material.is_published == published_only)
        
        # Filter out RAG materials (those with uploaded_for="RAG" in metadata)
        # Filter in Python after fetching for safety with JSONB
        # We'll filter materials where uploaded_for is not 'RAG' or doesn't exist
        # For now, we'll fetch all and filter in Python, or use a simpler approach
        # Check if file_metadata exists and uploaded_for is not 'RAG'
        query = query.where(
            or_(
                Material.file_metadata.is_(None),
                Material.file_metadata['uploaded_for'].astext != 'RAG'
            )
        )
        
        role = current_user.role
        user_id = current_user.user_id
        is_admin = role == "admin"
        is_supervisor = role in {"supervisor", "instructor"}

        if not is_admin and not is_supervisor:
            query = query.where(Material.is_published == True)
        elif is_supervisor and not is_admin:
            query = query.where(
                or_(
                    Material.uploaded_by == user_id,
                    Material.is_published == True,
                )
            )
        
        # Order by created_at descending
        query = query.order_by(Material.created_at.desc())
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        lectures = result.scalars().all()
        
        # Convert to response format
        lecture_list = []
        for material in lectures:
            # Get subject name
            subject_name = material.subject.name if material.subject else None
            
            # Get uploader name
            uploader_name = None
            if material.uploader:
                uploader_name = material.uploader.full_name or material.uploader.username
            
            # Get duration from metadata if available
            duration = None
            if material.file_metadata and isinstance(material.file_metadata, dict):
                duration = material.file_metadata.get('duration')
            
            lecture_list.append(LectureResponse(
                id=material.id,
                title=material.title,
                description=material.description,
                file_url=material.file_url,
                file_type=material.file_type,
                subject_id=material.subject_id,
                subject_name=subject_name,
                uploaded_by=material.uploaded_by,
                uploader_name=uploader_name,
                duration=duration,
                is_published=material.is_published,
                created_at=material.created_at.isoformat() if material.created_at else None,
                updated_at=material.updated_at.isoformat() if material.updated_at else None,
            ))
        
        logger.info("Retrieved %s lectures for user %s", len(lecture_list), current_user.user_id)
        return lecture_list
        
    except Exception as e:
        logger.error(f"Error listing lectures: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch lectures: {str(e)}"
        )


@router.get("/subjects", response_model=List[dict])
async def list_subjects_with_lectures(
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get list of subjects with lecture counts
    
    Returns:
        List of subjects with id, name, and lecture_count
    """
    try:
        # Get all active subjects
        subjects_query = select(Subject).where(Subject.is_active == True)
        subjects_result = await db.execute(subjects_query)
        subjects = subjects_result.scalars().all()
        
        # Build query to count lectures per subject
        # Filter out RAG materials
        materials_query = select(
            Material.subject_id,
            func.count(Material.id).label('lecture_count')
        ).where(
            or_(
                Material.file_metadata.is_(None),
                Material.file_metadata['uploaded_for'].astext != 'RAG'
            )
        )
        
        role = current_user.role
        is_admin = role == "admin"
        is_supervisor = role in {"supervisor", "instructor"}

        if is_supervisor and not is_admin:
            materials_query = materials_query.where(
                or_(
                    Material.uploaded_by == current_user.user_id,
                    Material.is_published == True,
                )
            )
        
        materials_query = materials_query.group_by(Material.subject_id)
        result_materials = await db.execute(materials_query)
        lecture_counts = {row.subject_id: row.lecture_count for row in result_materials.all()}
        
        # Build response
        subjects_list = []
        for subject in subjects:
            subjects_list.append({
                "id": subject.id,
                "name": subject.name,
                "code": getattr(subject, 'code', None),
                "lecture_count": lecture_counts.get(subject.id, 0)
            })
        
        return subjects_list
        
    except Exception as e:
        logger.error(f"Error listing subjects with lectures: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subjects: {str(e)}"
        )


async def save_lecture_file(file: UploadFile) -> tuple[str, str, int]:
    """Save uploaded lecture file and return (file_path, file_url, file_size)"""
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    file_path = LECTURE_UPLOAD_DIR / unique_filename
    file_size = 0
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        file_size = len(content)
        
        # Check file size
        if file_size > LECTURE_MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File quá lớn. Tối đa {LECTURE_MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        await f.write(content)
    
    # Generate file URL (relative to uploads directory)
    file_url = f"/uploads/lectures/{unique_filename}"
    
    return str(file_path), file_url, file_size


@router.post("/", response_model=LectureResponse)
async def create_lecture(
    file: Optional[UploadFile] = File(None),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    subject_id: int = Form(...),
    is_published: bool = Form(False),
    auth_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    current_profile: Profile = Depends(get_current_user_profile),
    db: AsyncSession = Depends(get_db_session_write),
):
    """
    Create a new lecture - Admin or Instructor only
    
    Args:
        file: Optional file to upload
        title: Title of the lecture
        description: Description of the lecture
        subject_id: Subject ID this lecture belongs to
        is_published: Whether to publish immediately
        db: Database session
        current_user: Current user (must be admin or instructor)
    
    Returns:
        LectureResponse with lecture details
    """
    try:
        # Check if subject exists
        result = await db.execute(select(Subject).where(Subject.id == subject_id))
        subject = result.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} not found"
            )
        
        # Save file if provided
        file_url = None
        file_type = None
        file_path = None
        file_size = 0
        
        if file:
            # Validate file extension
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in LECTURE_ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Loại file không được hỗ trợ cho bài giảng: {file_ext}"
                )
            
            file_path, file_url, file_size = await save_lecture_file(file)
            file_type = file_ext[1:] if file_ext else None  # Remove the dot
        
        # Create Material record for lecture
        material = Material(
            title=title,
            description=description or "",
            file_url=file_url,
            file_type=file_type,
            subject_id=subject_id,
            uploaded_by=auth_user.user_id,
            is_published=is_published,
            file_metadata={
                "file_size": file_size,
                "file_name": file.filename if file else None,
                "file_path": file_path,
                "mime_type": file.content_type if file else None,
                "uploaded_for": "lecture",
                "duration": None,  # Can be extracted from video/audio files later
            }
        )
        
        db.add(material)
        await db.commit()
        await db.refresh(material)
        
        logger.info(
            "Lecture created: %s (ID: %s) by user %s",
            material.title,
            material.id,
            auth_user.user_id,
        )
        
        # Return response
        return LectureResponse(
            id=material.id,
            title=material.title,
            description=material.description,
            file_url=material.file_url,
            file_type=material.file_type,
            subject_id=material.subject_id,
            subject_name=subject.name,
            uploaded_by=material.uploaded_by,
            uploader_name=current_profile.full_name or str(auth_user.user_id),
            duration=None,
            is_published=material.is_published,
            created_at=material.created_at.isoformat() if material.created_at else None,
            updated_at=material.updated_at.isoformat() if material.updated_at else None,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating lecture: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create lecture: {str(e)}"
        )


@router.delete("/{lecture_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lecture(
    lecture_id: int,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """
    Delete a lecture - Admin or Instructor (own lectures only)
    
    Args:
        lecture_id: ID of the lecture to delete
        db: Database session
        current_user: Current user
    
    Returns:
        204 No Content on success
    """
    try:
        # Get material
        result = await db.execute(select(Material).where(Material.id == lecture_id))
        material = result.scalar_one_or_none()
        
        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lecture not found"
            )
        
        is_admin = current_user.role == "admin"
        is_supervisor = current_user.role in {"supervisor", "instructor"}

        if not is_admin:
            if not is_supervisor or material.uploaded_by != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không có quyền xóa bài giảng này",
                )
        
        # Delete file if exists
        if material.file_metadata and isinstance(material.file_metadata, dict):
            file_path = material.file_metadata.get('file_path')
            if file_path and Path(file_path).exists():
                try:
                    Path(file_path).unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete file {file_path}: {e}")
        
        # Delete material
        await db.execute(delete(Material).where(Material.id == lecture_id))
        await db.commit()
        
        logger.info("Lecture deleted: %s by user %s", lecture_id, current_user.user_id)
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lecture: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete lecture: {str(e)}"
        )

