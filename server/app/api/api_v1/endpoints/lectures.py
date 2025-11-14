"""
Lectures API endpoints for managing course lectures/materials
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    Request,
)
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, cast, String, delete, text
from sqlalchemy.orm import selectinload
from pathlib import Path
import uuid
import aiofiles
import logging
from uuid import UUID

from ....core.database import get_db_session_write, get_db_session_read
from ....core.supabase_client import get_supabase_client
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_supervisor_user,
    get_current_user_profile,
)
from ....models.user import Profile
from ....models.content import Material, MaterialType
from ....models.library import LibrarySubject
from pydantic import BaseModel
from fastapi import UploadFile, File

logger = logging.getLogger(__name__)
router = APIRouter()

# File upload configuration for lectures
LECTURE_UPLOAD_DIR = Path("uploads/lectures")
LECTURE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

LECTURE_ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",  # Documents
    ".mp4",
    ".avi",
    ".mov",
    ".webm",  # Videos
    ".mp3",
    ".wav",  # Audio
    ".jpg",
    ".jpeg",
    ".png",  # Images
}

LECTURE_MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB


class LectureResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    material_type: Optional[str] = None  # Loại tài liệu (book, video, slide, ...)
    subject_id: int
    subject_name: Optional[str] = None
    uploaded_by: UUID
    uploader_name: Optional[str] = None
    duration: Optional[str] = None
    is_published: bool
    # Link to library document chapter (for lectures to reference library chapters)
    chapter_number: Optional[int] = None
    chapter_title: Optional[str] = None
    lesson_number: Optional[int] = None
    lesson_title: Optional[str] = None
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
    published_only: Optional[bool] = Query(
        None, description="Filter by published status"
    ),
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
        # Eager load relationships to avoid greenlet_spawn errors
        query = (
            select(Material)
            .options(
                selectinload(Material.subject),
                selectinload(Material.uploader),
            )
            .join(LibrarySubject, Material.subject_id == LibrarySubject.id)
        )

        # Filter by subject if provided
        if subject_id:
            query = query.where(Material.subject_id == subject_id)

        # Filter by published status
        if published_only is not None:
            query = query.where(Material.is_published == published_only)

        # Filter to only show lectures (uploaded_for="lecture" in metadata)
        # This ensures we only show actual lectures, not RAG materials or other content types
        # Only show materials where uploaded_for is explicitly "lecture"
        # Use PostgreSQL JSON operator ->> to extract text directly
        query = query.where(
            and_(
                Material.file_metadata.isnot(None),
                text("materials.file_metadata->>'uploaded_for' = 'lecture'"),
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

        logger.info(f"Found {len(lectures)} lectures after filtering")
        if len(lectures) == 0:
            # Debug: Check if there are any materials at all
            debug_query = select(func.count(Material.id))
            debug_result = await db.execute(debug_query)
            total_materials = debug_result.scalar()
            logger.info(f"Total materials in database: {total_materials}")

            # Check materials with file_metadata
            debug_query2 = select(func.count(Material.id)).where(
                Material.file_metadata.isnot(None)
            )
            debug_result2 = await db.execute(debug_query2)
            materials_with_metadata = debug_result2.scalar()
            logger.info(f"Materials with file_metadata: {materials_with_metadata}")

            # Debug: Check actual file_metadata values
            debug_query3 = select(Material.id, Material.title, Material.file_metadata)
            debug_result3 = await db.execute(debug_query3)
            all_materials = debug_result3.all()
            for mat in all_materials:
                logger.info(
                    f"Material ID {mat.id} ({mat.title}): file_metadata = {mat.file_metadata}"
                )
                if mat.file_metadata and isinstance(mat.file_metadata, dict):
                    uploaded_for = mat.file_metadata.get("uploaded_for")
                    logger.info(
                        f"  -> uploaded_for value: {uploaded_for} (type: {type(uploaded_for)})"
                    )

        # Convert to response format
        lecture_list = []
        for material in lectures:
            # Get subject name
            subject_name = material.subject.name if material.subject else None

            # Get uploader name
            uploader_name = None
            if material.uploader:
                uploader_name = (
                    material.uploader.full_name or material.uploader.username
                )

            # Get duration from metadata if available
            duration = None
            if material.file_metadata and isinstance(material.file_metadata, dict):
                duration = material.file_metadata.get("duration")

            # Get material_type
            material_type_str = None
            if material.material_type:
                material_type_str = material.material_type.value

            lecture_list.append(
                LectureResponse(
                    id=material.id,
                    title=material.title,
                    description=material.description,
                    file_url=material.file_url,
                    file_type=material.file_type,
                    material_type=material_type_str,
                    subject_id=material.subject_id,
                    subject_name=subject_name,
                    uploaded_by=material.uploaded_by,
                    uploader_name=uploader_name,
                    duration=duration,
                    is_published=material.is_published,
                    chapter_number=material.chapter_number,
                    chapter_title=material.chapter_title,
                    lesson_number=material.lesson_number,
                    lesson_title=material.lesson_title,
                    created_at=material.created_at.isoformat()
                    if material.created_at
                    else None,
                    updated_at=material.updated_at.isoformat()
                    if material.updated_at
                    else None,
                )
            )

        logger.info(
            "Retrieved %s lectures for user %s", len(lecture_list), current_user.user_id
        )
        return lecture_list

    except Exception as e:
        logger.error(f"Error listing lectures: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch lectures: {str(e)}",
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
        # Get all subjects (including inactive ones for admin)
        # For non-admin users, only show active subjects
        role = current_user.role
        is_admin = role == "admin"

        if is_admin:
            # Admin can see all subjects
            subjects_query = select(LibrarySubject)
        else:
            # Non-admin users only see active subjects
            subjects_query = select(LibrarySubject).where(
                LibrarySubject.is_active == True
            )

        subjects_result = await db.execute(subjects_query)
        subjects = subjects_result.scalars().all()

        # Build query to count lectures per subject
        # Only count materials where uploaded_for is explicitly "lecture"
        # Use PostgreSQL JSON operator ->> to extract text directly
        materials_query = select(
            Material.subject_id, func.count(Material.id).label("lecture_count")
        ).where(
            and_(
                Material.file_metadata.isnot(None),
                text("materials.file_metadata->>'uploaded_for' = 'lecture'"),
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
        lecture_counts = {
            row.subject_id: row.lecture_count for row in result_materials.all()
        }

        # Build response - return all subjects even if they have 0 lectures
        subjects_list = []
        for subject in subjects:
            subjects_list.append(
                {
                    "id": subject.id,
                    "name": subject.name,
                    "code": getattr(subject, "code", None),
                    "lecture_count": lecture_counts.get(subject.id, 0),
                }
            )

        logger.info(
            f"Returning {len(subjects_list)} subjects for user {current_user.user_id} (role: {current_user.role})"
        )
        return subjects_list

    except Exception as e:
        logger.error(f"Error listing subjects with lectures: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subjects: {str(e)}",
        )


# NOTE: save_lecture_file is no longer used - files are now uploaded directly to Supabase Storage by the client
# Keeping this function for reference, but it's not called anymore
# async def save_lecture_file(file: UploadFile) -> tuple[str, str, int]:
#     """Save uploaded lecture file and return (file_path, file_url, file_size)"""
#     # This function is deprecated - files are now uploaded to Supabase Storage
#     pass


class LectureCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: int
    material_type: Optional[str] = (
        None  # Loại tài liệu (book, video, slide, document, audio, image, other)
    )
    is_published: bool = False
    chapter_number: Optional[int] = None
    chapter_title: Optional[str] = None
    lesson_number: Optional[int] = None
    lesson_title: Optional[str] = None
    file_url: Optional[str] = None  # Supabase Storage URL
    file_type: Optional[str] = None
    file_size: Optional[int] = None


class LectureUpdateRequest(BaseModel):
    """Schema for updating a lecture - all fields are optional"""

    title: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[int] = None
    material_type: Optional[str] = (
        None  # Loại tài liệu (book, video, slide, document, audio, image, other)
    )
    is_published: Optional[bool] = None
    chapter_number: Optional[int] = None
    chapter_title: Optional[str] = None
    lesson_number: Optional[int] = None
    lesson_title: Optional[str] = None
    file_url: Optional[str] = None  # Supabase Storage URL
    file_type: Optional[str] = None
    file_size: Optional[int] = None


class UploadFileResponse(BaseModel):
    """Response model for file upload endpoint"""

    file_url: str
    file_path: str
    file_type: str
    file_size: int


@router.post("/upload", response_model=UploadFileResponse)
async def upload_lecture_file(
    file: UploadFile = File(...),
    auth_user: AuthenticatedUser = Depends(get_current_supervisor_user),
):
    """
    Upload a lecture file to Supabase Storage.

    This endpoint uses service role key to bypass RLS and upload files directly.
    Files are organized by user ID: lectures/{user_id}/{filename}

    Args:
        file: File to upload
        auth_user: Current authenticated user (must be admin or instructor)

    Returns:
        UploadFileResponse with file URL and metadata
    """
    # Validate file type
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in LECTURE_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed: {', '.join(LECTURE_ALLOWED_EXTENSIONS)}",
        )

    # Validate file size (max 500MB)
    file_content = await file.read()
    file_size = len(file_content)
    max_size = 500 * 1024 * 1024  # 500MB
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: 500MB",
        )

    # Get Supabase client (with service role key)
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client not configured",
        )

    # Generate unique filename
    user_id = str(auth_user.user_id)
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = f"{user_id}/{unique_filename}"

    try:
        # Upload to Supabase Storage using Python client
        # Note: Supabase Python client uses different method names
        storage_bucket = supabase.storage.from_("lectures")

        # Upload file (returns dict with 'path' or raises exception)
        upload_result = storage_bucket.upload(
            path=file_path,
            file=file_content,
            file_options={
                "content-type": file.content_type or "application/octet-stream",
                "cache-control": "3600",
            },
        )

        # Check for errors in upload result
        if isinstance(upload_result, dict) and "error" in upload_result:
            logger.error(f"Supabase upload error: {upload_result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {upload_result['error']}",
            )

        # Get public URL
        url_result = storage_bucket.get_public_url(file_path)

        logger.info(f"File uploaded successfully: {file_path} by user {user_id}")

        return UploadFileResponse(
            file_url=url_result,
            file_path=file_path,
            file_type=file_ext.lstrip("."),
            file_size=file_size,
        )
    except Exception as e:
        logger.error(f"Error uploading file to Supabase Storage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )


@router.post("/", response_model=LectureResponse)
async def create_lecture(
    request: Request,
    auth_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    current_profile: Profile = Depends(get_current_user_profile),
    db: AsyncSession = Depends(get_db_session_write),
):
    """
    Create a new lecture - Admin or Instructor only

    File is uploaded to Supabase Storage by the client, and the URL is sent here.

    Args:
        request: Request body containing lecture data and file_url from Supabase Storage
        db: Database session
        auth_user: Current user (must be admin or instructor)

    Returns:
        LectureResponse with lecture details
    """
    try:
        # Parse JSON body
        body = await request.json()
        lecture_data = LectureCreateRequest(**body)

        # Check if subject exists
        result = await db.execute(
            select(LibrarySubject).where(LibrarySubject.id == lecture_data.subject_id)
        )
        subject = result.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {lecture_data.subject_id} not found",
            )

        # Parse material_type
        material_type_enum = None
        if lecture_data.material_type:
            try:
                material_type_enum = MaterialType(lecture_data.material_type)
            except ValueError:
                logger.warning(
                    f"Invalid material_type: {lecture_data.material_type}, using None"
                )
                material_type_enum = None

        # Create Material record for lecture
        # File is already uploaded to Supabase Storage by client
        material = Material(
            title=lecture_data.title,
            description=lecture_data.description or "",
            file_url=lecture_data.file_url,
            file_type=lecture_data.file_type,
            material_type=material_type_enum,
            subject_id=lecture_data.subject_id,
            uploaded_by=auth_user.user_id,
            is_published=lecture_data.is_published,
            chapter_number=lecture_data.chapter_number,
            chapter_title=lecture_data.chapter_title,
            lesson_number=lecture_data.lesson_number,
            lesson_title=lecture_data.lesson_title,
            file_metadata={
                "file_size": lecture_data.file_size or 0,
                "file_name": None,  # Not needed since file is in Supabase Storage
                "file_path": lecture_data.file_url,  # Store Supabase Storage URL
                "mime_type": None,  # Can be inferred from file_type
                "uploaded_for": "lecture",
                "storage": "supabase",  # Indicate file is stored in Supabase Storage
                "duration": None,  # Can be extracted from video/audio files later
            },
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

        # Get material_type
        material_type_str = None
        if material.material_type:
            material_type_str = material.material_type.value

        # Return response
        return LectureResponse(
            id=material.id,
            title=material.title,
            description=material.description,
            file_url=material.file_url,
            file_type=material.file_type,
            material_type=material_type_str,
            subject_id=material.subject_id,
            subject_name=subject.name,
            uploaded_by=material.uploaded_by,
            uploader_name=current_profile.full_name or str(auth_user.user_id),
            duration=None,
            is_published=material.is_published,
            chapter_number=material.chapter_number,
            chapter_title=material.chapter_title,
            lesson_number=material.lesson_number,
            lesson_title=material.lesson_title,
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
            detail=f"Failed to create lecture: {str(e)}",
        )


@router.patch("/{lecture_id}", response_model=LectureResponse)
async def update_lecture(
    lecture_id: int,
    request: Request,
    auth_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    current_profile: Profile = Depends(get_current_user_profile),
    db: AsyncSession = Depends(get_db_session_write),
):
    """
    Update a lecture - Admin or Instructor (own lectures only)

    Args:
        lecture_id: ID of the lecture to update
        request: Request body containing lecture data to update
        db: Database session
        auth_user: Current user (must be admin or instructor)

    Returns:
        LectureResponse with updated lecture details
    """
    try:
        # Get material
        result = await db.execute(
            select(Material)
            .options(
                selectinload(Material.subject),
                selectinload(Material.uploader),
            )
            .where(Material.id == lecture_id)
        )
        material = result.scalar_one_or_none()

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found"
            )

        # Check permissions
        is_admin = auth_user.role == "admin"
        is_supervisor = auth_user.role in {"supervisor", "instructor"}

        if not is_admin:
            if not is_supervisor or material.uploaded_by != auth_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không có quyền chỉnh sửa bài giảng này",
                )

        # Parse JSON body
        body = await request.json()
        update_data = LectureUpdateRequest(**body)

        # Check if subject exists (if subject_id is being updated)
        if update_data.subject_id is not None:
            result = await db.execute(
                select(LibrarySubject).where(
                    LibrarySubject.id == update_data.subject_id
                )
            )
            subject = result.scalar_one_or_none()
            if not subject:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Subject with ID {update_data.subject_id} not found",
                )

        # Parse material_type if provided
        if update_data.material_type is not None:
            try:
                material.material_type = MaterialType(update_data.material_type)
            except ValueError:
                logger.warning(
                    f"Invalid material_type: {update_data.material_type}, keeping existing value"
                )

        # Update fields (only update fields that are provided)
        update_dict = update_data.dict(
            exclude_unset=True, exclude={"material_type"}
        )  # Exclude material_type as it's handled above
        for field, value in update_dict.items():
            if field == "file_url" or field == "file_type" or field == "file_size":
                # Handle file-related fields
                if field == "file_url":
                    material.file_url = value
                elif field == "file_type":
                    material.file_type = value
                # file_size is stored in file_metadata
            else:
                setattr(material, field, value)

        # Update file_metadata if file-related fields are being updated
        if any(
            field in update_dict for field in ["file_url", "file_type", "file_size"]
        ):
            # Get current file_metadata or create new dict
            current_metadata = material.file_metadata
            if current_metadata is None or not isinstance(current_metadata, dict):
                current_metadata = {}

            # Create updated metadata dict
            updated_metadata = current_metadata.copy()

            if "file_url" in update_dict:
                updated_metadata["file_path"] = update_dict["file_url"]
            if "file_size" in update_dict:
                updated_metadata["file_size"] = update_dict["file_size"]
            if "file_type" in update_dict:
                updated_metadata["mime_type"] = None  # Can be inferred from file_type
            # Ensure uploaded_for and storage are set
            updated_metadata["uploaded_for"] = "lecture"
            updated_metadata["storage"] = "supabase"

            # Assign the updated dict back to material
            material.file_metadata = updated_metadata

        await db.commit()
        await db.refresh(material)

        # Reload relationships
        await db.refresh(material, ["subject", "uploader"])

        logger.info(
            "Lecture updated: %s (ID: %s) by user %s",
            material.title,
            material.id,
            auth_user.user_id,
        )

        # Get subject name
        subject_name = None
        if material.subject:
            subject_name = material.subject.name
        elif update_data.subject_id is not None:
            # If subject was updated, fetch it
            result = await db.execute(
                select(LibrarySubject).where(LibrarySubject.id == material.subject_id)
            )
            subject = result.scalar_one_or_none()
            if subject:
                subject_name = subject.name

        # Get uploader name
        uploader_name = None
        if material.uploader:
            uploader_name = material.uploader.full_name or material.uploader.username

        # Get duration from metadata if available
        duration = None
        if material.file_metadata and isinstance(material.file_metadata, dict):
            duration = material.file_metadata.get("duration")

        # Get material_type
        material_type_str = None
        if material.material_type:
            material_type_str = material.material_type.value

        # Return response
        return LectureResponse(
            id=material.id,
            title=material.title,
            description=material.description,
            file_url=material.file_url,
            file_type=material.file_type,
            material_type=material_type_str,
            subject_id=material.subject_id,
            subject_name=subject_name,
            uploaded_by=material.uploaded_by,
            uploader_name=uploader_name,
            duration=duration,
            is_published=material.is_published,
            chapter_number=material.chapter_number,
            chapter_title=material.chapter_title,
            lesson_number=material.lesson_number,
            lesson_title=material.lesson_title,
            created_at=material.created_at.isoformat() if material.created_at else None,
            updated_at=material.updated_at.isoformat() if material.updated_at else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lecture: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update lecture: {str(e)}",
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
                status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found"
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
            file_path = material.file_metadata.get("file_path")
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
            detail=f"Failed to delete lecture: {str(e)}",
        )
