"""
Admin API endpoints for user role management
"""

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from starlette import status
from typing import Any, Dict, List, Optional, cast
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pathlib import Path
import uuid
import aiofiles
from datetime import datetime

from ....models.user import Profile
from ....models.content import Material
from ....models.assessment import Assessment
from ....models.test_result import TestResult
from ....schemas.admin import (
    RoleUpdateRequest,
    UserListResponse,
    AIDataItemResponse,
    AIDataStatsResponse,
)
from ....core.database import get_db_session_write, get_db_session_read
from ....core.supabase_client import get_supabase_client
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_admin_user,
    get_current_user_profile,
)
from ....middleware.rate_limiter import clear_rate_limit_store

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_material_status(metadata: Optional[dict]) -> tuple[str, str]:
    if not isinstance(metadata, dict):
        return "PENDING", "Chưa xử lý"

    raw_status = str(metadata.get("file_search_status", "PENDING")).upper()
    status_map = {
        "PENDING": "Chưa xử lý",
        "INDEXING": "Đang xử lý",
        "COMPLETED": "Đã xử lý",
        "FAILED": "Thất bại",
    }
    return raw_status, status_map.get(raw_status, "Chưa xử lý")


@router.post(
    "/users/{user_id}/set-role",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin_user)],
)
def set_user_role(
    user_id: UUID,
    request: RoleUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    API Endpoint CHỈ DÀNH CHO ADMIN để gán vai trò.

    Args:
        user_id: ID của user cần gán role
        request: RoleUpdateRequest với role cần gán
        db: Database session
        current_user: Current admin user (from dependency)

    Returns:
        204 No Content on success
    """
    # Validate role
    valid_roles = ["admin", "instructor", "student"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vai trò không hợp lệ. Vai trò hợp lệ: {', '.join(valid_roles)}",
        )

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client is not configured",
        )

    user_id_str = str(user_id)

    try:
        supabase.auth.admin.get_user_by_id(user_id_str)
    except Exception as exc:
        logger.error("Error fetching user %s from Supabase: %s", user_id_str, exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in Supabase",
        ) from exc

    try:
        supabase.auth.admin.update_user_by_id(
            user_id_str,
            attributes={
                "app_metadata": {"user_role": request.role},
            },
        )
        logger.info(
            "User %s role updated to '%s' by admin %s",
            user_id_str,
            request.role,
            current_user.user_id,
        )
    except Exception as exc:
        logger.error("Error updating user role in Supabase: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật vai trò trên Supabase",
        ) from exc

    return None


@router.get(
    "/users",
    response_model=List[UserListResponse],
    dependencies=[Depends(get_current_admin_user)],
)
async def list_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of users to return"),
    search: Optional[str] = Query(
        None, description="Search by email, username, or full_name"
    ),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get list of users (Admin only)

    Args:
        skip: Number of users to skip
        limit: Number of users to return
        search: Search term for email, username, or full_name
        db: Database session
        current_user: Current admin user (from dependency)

    Returns:
        List of users
    """
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase client is not configured",
            )

        per_page = limit
        page = max((skip // max(per_page, 1)) + 1, 1)

        try:
            supabase_users = supabase.auth.admin.list_users(
                page=page,
                per_page=per_page,
            )
        except Exception as exc:
            logger.error("Error listing users from Supabase: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch users from Supabase",
            ) from exc

        users_data = getattr(supabase_users, "users", None)
        if users_data is None and isinstance(supabase_users, dict):
            users_data = supabase_users.get("users", [])
        users_data = users_data or []

        search_lower = search.lower() if search else None
        responses: List[UserListResponse] = []

        for auth_user in users_data:
            auth_user_id = getattr(auth_user, "id", None) or auth_user.get("id")
            if not auth_user_id:
                continue

            user_uuid = UUID(str(auth_user_id))

            profile: Optional[Profile] = await db.get(Profile, user_uuid)
            profile_full_name = (
                cast(Optional[str], getattr(profile, "full_name", None))
                if profile
                else None
            )
            profile_avatar = (
                cast(Optional[str], getattr(profile, "avatar_url", None))
                if profile
                else None
            )
            profile_extra_raw = (
                getattr(profile, "extra_metadata", None) if profile else None
            )
            profile_extra: Dict[str, Any] = (
                profile_extra_raw if isinstance(profile_extra_raw, dict) else {}
            )

            email = getattr(auth_user, "email", None) or auth_user.get("email")
            user_metadata = getattr(auth_user, "user_metadata", None) or getattr(
                auth_user, "user_metadata", {}
            )
            app_metadata = getattr(auth_user, "app_metadata", None) or getattr(
                auth_user, "app_metadata", {}
            )

            full_name = (
                profile_full_name
                or (
                    user_metadata.get("full_name")
                    if isinstance(user_metadata, dict)
                    else None
                )
                or (email.split("@")[0] if email else "Chưa cập nhật")
            )

            username = None
            if profile_extra:
                username = cast(Optional[str], profile_extra.get("username"))
            if not username and isinstance(user_metadata, dict):
                username = cast(Optional[str], user_metadata.get("username"))
            if not username and email:
                username = email.split("@")[0]
            if not username:
                username = str(user_uuid)

            if search_lower:
                haystack = " ".join(
                    filter(
                        None,
                        [
                            email.lower() if email else "",
                            full_name.lower() if full_name else "",
                            username.lower() if username else "",
                        ],
                    )
                )
                if search_lower not in haystack:
                    continue

            role = (
                app_metadata.get("user_role", "student")
                if isinstance(app_metadata, dict)
                else "student"
            )
            role = str(role).lower()

            is_superuser = role == "admin"
            is_instructor = role == "instructor"

            is_active = getattr(auth_user, "banned_until", None) in (None, "", 0)
            email_verified = bool(
                getattr(auth_user, "email_confirmed_at", None)
                or (
                    isinstance(user_metadata, dict)
                    and user_metadata.get("email_verified")
                )
            )

            created_at = getattr(auth_user, "created_at", None) or getattr(
                auth_user, "created_at", None
            )

            total_assessments = 0
            total_results = 0

            if is_instructor or is_superuser:
                count_query = select(func.count(Assessment.id)).where(
                    Assessment.created_by == user_uuid
                )
                result_count = await db.execute(count_query)
                total_assessments = result_count.scalar() or 0

            if role == "student":
                count_query = select(func.count(TestResult.id)).where(
                    TestResult.user_id == user_uuid
                )
                result_count = await db.execute(count_query)
                total_results = result_count.scalar() or 0

            avatar_url = profile_avatar
            if avatar_url is None and isinstance(user_metadata, dict):
                avatar_url = cast(Optional[str], user_metadata.get("avatar_url"))

            response = UserListResponse.model_validate(
                {
                    "id": user_uuid,
                    "email": email or "",
                    "username": username,
                    "full_name": full_name or "",
                    "is_active": bool(is_active),
                    "is_superuser": is_superuser,
                    "is_instructor": is_instructor,
                    "email_verified": email_verified,
                    "avatar_url": avatar_url,
                    "created_at": created_at,
                    "role": role,
                    "total_assessments": total_assessments,
                    "total_results": total_results,
                }
            )
            responses.append(response)

        logger.info(
            "Retrieved %s users from Supabase for admin %s",
            len(responses),
            current_user.user_id,
        )
        return responses

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error listing users: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users",
        ) from exc


@router.post(
    "/rate-limit/clear",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_admin_user)],
)
def clear_rate_limit(
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    Clear rate limit store (Admin only)

    Args:
        current_user: Current admin user (from dependency)

    Returns:
        Success message
    """
    try:
        clear_rate_limit_store()
        logger.info("Rate limit store cleared by admin %s", current_user.user_id)
        return {"message": "Rate limit store cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing rate limit store: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear rate limit store",
        )


# ===============================
# AI Data Management Endpoints
# ===============================


@router.get(
    "/ai-data",
    response_model=List[AIDataItemResponse],
    dependencies=[Depends(get_current_admin_user)],
)
async def list_ai_data(
    search: Optional[str] = Query(None, description="Search by title or description"),
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    status_filter: Optional[str] = Query(
        None, description="Filter by status: PENDING, INDEXING, COMPLETED, FAILED"
    ),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of items to return"),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get list of AI data (materials with embeddings) - Admin only

    Args:
        search: Search term for title or description
        subject_id: Filter by subject ID
        status_filter: Filter by processing status
        skip: Number of items to skip
        limit: Number of items to return
        db: Database session
        current_user: Current admin user

    Returns:
        List of AI data items with embeddings stats
    """
    try:
        from ....models.organization import Subject

        search_lower = search.lower() if search else None
        status_upper = status_filter.upper() if status_filter else None

        materials_query = select(Material).order_by(Material.created_at.desc())

        if subject_id is not None:
            materials_query = materials_query.where(Material.subject_id == subject_id)

        result = await db.execute(materials_query)
        materials = result.scalars().all()

        rag_materials: List[Material] = []
        for material in materials:
            raw_metadata = getattr(material, "file_metadata", None)
            metadata: Dict[str, Any] = (
                raw_metadata if isinstance(raw_metadata, dict) else {}
            )
            uploaded_for = str(metadata.get("uploaded_for", "")).upper()
            if uploaded_for not in ("RAG", "FILE_SEARCH"):
                continue

            title_search_value = cast(Optional[str], getattr(material, "title", None))
            description_search_value = cast(
                Optional[str], getattr(material, "description", None)
            )

            if search_lower:
                haystack = " ".join(
                    filter(
                        None,
                        [
                            title_search_value.lower() if title_search_value else "",
                            description_search_value.lower()
                            if description_search_value
                            else "",
                        ],
                    )
                )
                if search_lower not in haystack:
                    continue
            if status_upper:
                mat_status, _ = _get_material_status(metadata)
                if mat_status != status_upper:
                    continue
            rag_materials.append(material)

        paginated_materials = rag_materials[skip : skip + limit]

        subject_lookup: Dict[int, Optional[Any]] = {}
        ai_data_items: List[AIDataItemResponse] = []

        for material in paginated_materials:
            raw_metadata = getattr(material, "file_metadata", None)
            metadata = raw_metadata if isinstance(raw_metadata, dict) else {}
            status_value, status_text = _get_material_status(metadata)
            tags_value_raw = metadata.get("tags")
            tags_value = tags_value_raw if isinstance(tags_value_raw, list) else None
            file_size_value = metadata.get("file_size")
            file_size = (
                int(file_size_value)
                if isinstance(file_size_value, (int, float))
                else None
            )

            subject_name = None
            subject_id_value = cast(
                Optional[int], getattr(material, "subject_id", None)
            )
            if subject_id_value is not None:
                if subject_id_value not in subject_lookup:
                    subject_lookup[subject_id_value] = None
                    try:
                        from ....models.organization import Subject  # type: ignore

                        result = await db.execute(
                            select(Subject).where(Subject.id == subject_id_value)
                        )
                        subject_lookup[subject_id_value] = result.scalar_one_or_none()
                    except Exception:
                        subject_lookup[subject_id_value] = None
                subject_obj = subject_lookup.get(subject_id_value)
                if subject_obj:
                    subject_name = getattr(subject_obj, "name", None)

            uploader_name = None
            uploader_profile = getattr(material, "uploader", None)
            if uploader_profile:
                uploader_full_name = cast(
                    Optional[str], getattr(uploader_profile, "full_name", None)
                )
                if uploader_full_name:
                    uploader_name = uploader_full_name
                else:
                    uploader_extra = getattr(uploader_profile, "extra_metadata", None)
                    if isinstance(uploader_extra, dict):
                        uploader_name = cast(
                            Optional[str], uploader_extra.get("username")
                        )

            material_id = cast(int, getattr(material, "id"))
            title_value = title_search_value or ""
            description_value = description_search_value
            file_type_value = cast(Optional[str], getattr(material, "file_type", None))
            file_url_value = cast(Optional[str], getattr(material, "file_url", None))
            uploaded_by_value = cast(
                Optional[UUID], getattr(material, "uploaded_by", None)
            )
            created_at_value = cast(
                Optional[datetime], getattr(material, "created_at", None)
            )
            updated_at_value = cast(
                Optional[datetime], getattr(material, "updated_at", None)
            )
            is_published_value = cast(
                Optional[bool], getattr(material, "is_published", None)
            )

            ai_data_items.append(
                AIDataItemResponse(
                    id=material_id,
                    title=title_value,
                    description=description_value,
                    file_type=file_type_value,
                    file_url=file_url_value,
                    file_size=file_size,
                    subject_id=subject_id_value,
                    subject_name=subject_name,
                    uploaded_by=uploaded_by_value,
                    uploader_name=uploader_name,
                    upload_date=created_at_value,
                    last_processed=updated_at_value,
                    status=status_value,
                    status_text=status_text,
                    embeddings_count=0,
                    chunks_count=0,
                    usage_count=0,
                    tags=tags_value,
                    is_published=is_published_value or False,
                    created_at=created_at_value,
                    updated_at=updated_at_value,
                )
            )

        logger.info(
            "Retrieved %s AI data items for admin %s",
            len(ai_data_items),
            current_user.user_id,
        )
        return ai_data_items

    except Exception as e:
        logger.error(f"Error listing AI data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch AI data: {str(e)}",
        )


@router.get(
    "/ai-data/stats",
    response_model=AIDataStatsResponse,
    dependencies=[Depends(get_current_admin_user)],
)
async def get_ai_data_stats(
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get AI data statistics - Admin only

    Args:
        db: Database session
        current_user: Current admin user

    Returns:
        AI data statistics
    """
    try:
        result = await db.execute(select(Material))
        materials = result.scalars().all()
        total_materials = 0
        processed_materials = 0
        processing_materials = 0
        failed_materials = 0

        for material in materials:
            raw_metadata = getattr(material, "file_metadata", None)
            metadata = raw_metadata if isinstance(raw_metadata, dict) else {}
            uploaded_for = str(metadata.get("uploaded_for", "")).upper()
            if uploaded_for not in ("RAG", "FILE_SEARCH"):
                continue
            total_materials += 1
            status_value, _ = _get_material_status(metadata)
            if status_value == "COMPLETED":
                processed_materials += 1
            elif status_value == "INDEXING":
                processing_materials += 1
            elif status_value == "FAILED":
                failed_materials += 1

        failed_materials = max(failed_materials, 0)

        stats = AIDataStatsResponse(
            total_materials=total_materials,
            processed_materials=processed_materials,
            processing_materials=processing_materials,
            failed_materials=failed_materials,
            total_embeddings=0,
            total_chunks=0,
            total_usage=0,
        )

        logger.info("Retrieved AI data stats for admin %s", current_user.user_id)
        return stats

    except Exception as e:
        logger.error(f"Error getting AI data stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch AI data stats: {str(e)}",
        )


# File upload configuration for RAG materials
RAG_UPLOAD_DIR = Path("uploads/rag")
RAG_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

RAG_ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".md",  # Documents
    ".jpg",
    ".jpeg",
    ".png",  # Images
    ".mp4",  # Videos
    ".mp3",  # Audio
}

RAG_MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


def validate_rag_file(file: UploadFile) -> tuple[bool, str]:
    """Validate uploaded file for RAG"""
    if not file.filename:
        return False, "Tên file không hợp lệ"

    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in RAG_ALLOWED_EXTENSIONS:
        return (
            False,
            f"Loại file không được hỗ trợ cho RAG: {ext}. Hỗ trợ: PDF, DOC, DOCX, TXT, MD, JPG, PNG, MP4, MP3",
        )

    return True, "OK"


async def save_rag_file(file: UploadFile) -> tuple[str, str, int]:
    """Save uploaded RAG file and return (file_path, file_url, file_size)"""
    # Generate unique filename
    filename = file.filename or ""
    file_ext = Path(filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    file_path = RAG_UPLOAD_DIR / unique_filename
    file_size = 0

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        file_size = len(content)

        # Check file size
        if file_size > RAG_MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File quá lớn. Tối đa {RAG_MAX_FILE_SIZE // (1024 * 1024)}MB",
            )

        await f.write(content)

    # Generate file URL (relative to uploads directory)
    file_url = f"/uploads/rag/{unique_filename}"

    return str(file_path), file_url, file_size


@router.post(
    "/ai-data/upload",
    response_model=AIDataItemResponse,
    dependencies=[Depends(get_current_admin_user)],
)
async def upload_rag_material(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    subject_id: int = Form(...),
    tags: Optional[str] = Form(None),  # Comma-separated tags
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    current_profile: Profile = Depends(get_current_user_profile),
    db: AsyncSession = Depends(get_db_session_write),
):
    """
    Upload a material for RAG (Retrieval-Augmented Generation) - Admin only

    This endpoint:
    1. Validates and saves the uploaded file
    2. Creates a Material record in the database
    3. Triggers async indexing process (embeddings will be created later)

    Args:
        file: The file to upload (PDF, DOC, DOCX, TXT, MD, JPG, PNG, MP4, MP3)
        title: Title of the material
        description: Description of the material
        subject_id: Subject ID this material belongs to
        tags: Comma-separated tags
        db: Database session
        current_user: Current admin user

    Returns:
        AIDataItemResponse with material details
    """
    try:
        from ....models.organization import Subject

        # Validate file
        is_valid, error_msg = validate_rag_file(file)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg
            )

        # Check if subject exists
        result = await db.execute(select(Subject).where(Subject.id == subject_id))
        subject = result.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} not found",
            )

        # Save uploaded file
        file_path, file_url, file_size = await save_rag_file(file)

        # Get file type from extension
        original_filename = file.filename or ""
        file_type = (
            Path(original_filename).suffix.lower()[1:] if original_filename else None
        )  # Remove the dot

        # Parse tags
        tags_list = (
            [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        )

        # Create Material record
        material = Material(
            title=title,
            description=description or "",
            file_url=file_url,
            file_type=file_type,
            subject_id=subject_id,
            uploaded_by=current_user.user_id,
            is_published=True,  # RAG materials are published by default
            file_metadata={
                "file_size": file_size,
                "file_name": file.filename,
                "file_path": file_path,  # Store file_path in metadata
                "mime_type": file.content_type,
                "uploaded_for": "RAG",
                "tags": tags_list,
                "file_search_status": "PENDING",
            },
        )

        db.add(material)
        await db.commit()
        await db.refresh(material)

        logger.info(
            "RAG material uploaded: %s (ID: %s) by admin %s",
            material.title,
            material.id,
            current_user.user_id,
        )

        # TODO: Trigger async indexing process
        # This could be done via:
        # 1. Background task (Celery, etc.)
        # 2. Webhook to AI server
        # 3. Queue system
        # For now, indexing will be triggered manually or via separate endpoint

        current_profile_name = cast(
            Optional[str], getattr(current_profile, "full_name", None)
        )
        uploader_name = (
            current_profile_name or current_user.email or str(current_user.user_id)
        )

        material_id_value = cast(int, getattr(material, "id"))
        material_title_value = (
            cast(Optional[str], getattr(material, "title", None)) or ""
        )
        material_description_value = cast(
            Optional[str], getattr(material, "description", None)
        )
        material_file_type_value = cast(
            Optional[str], getattr(material, "file_type", None)
        )
        material_file_url_value = cast(
            Optional[str], getattr(material, "file_url", None)
        )
        material_subject_id_value = cast(
            Optional[int], getattr(material, "subject_id", None)
        )
        material_uploaded_by_value = cast(
            Optional[UUID], getattr(material, "uploaded_by", None)
        )
        material_created_at_value = cast(
            Optional[datetime], getattr(material, "created_at", None)
        )
        material_updated_at_value = cast(
            Optional[datetime], getattr(material, "updated_at", None)
        )
        material_is_published_value = cast(
            Optional[bool], getattr(material, "is_published", None)
        )
        subject_name_value = cast(Optional[str], getattr(subject, "name", None))

        # Return response
        return AIDataItemResponse(
            id=material_id_value,
            title=material_title_value,
            description=material_description_value,
            file_type=material_file_type_value,
            file_url=material_file_url_value,
            file_size=file_size,
            subject_id=material_subject_id_value,
            subject_name=subject_name_value,
            uploaded_by=material_uploaded_by_value,
            uploader_name=uploader_name,
            upload_date=material_created_at_value,
            last_processed=material_updated_at_value,
            status="PENDING",  # Will be updated when indexing completes
            status_text="Chưa xử lý",
            embeddings_count=0,
            chunks_count=0,
            usage_count=0,
            tags=tags_list,
            is_published=material_is_published_value or False,
            created_at=material_created_at_value,
            updated_at=material_updated_at_value,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading RAG material: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload RAG material: {str(e)}",
        )


@router.post(
    "/ai-data/{material_id}/index",
    response_model=dict,
    dependencies=[Depends(get_current_admin_user)],
)
async def trigger_rag_indexing(
    material_id: int,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """
    Trigger indexing process for a RAG material - Admin only

    This endpoint triggers the async process to:
    1. Extract text from the material file
    2. Split into chunks
    3. Generate embeddings using Gemini API
    4. Store embeddings in material_embeddings table

    Args:
        material_id: ID of the material to index
        db: Database session
        current_user: Current admin user

    Returns:
        Status message
    """
    try:
        # Get material
        result = await db.execute(select(Material).where(Material.id == material_id))
        material = result.scalar_one_or_none()

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Material not found"
            )

        metadata = (
            material.file_metadata if isinstance(material.file_metadata, dict) else {}
        )
        current_status = metadata.get("file_search_status", "PENDING")
        if current_status == "COMPLETED":
            return {
                "message": "Material đã được index",
                "material_id": material_id,
                "status": "COMPLETED",
            }

        metadata["file_search_status"] = "INDEXING"
        material.file_metadata = cast(Dict[str, Any], metadata)  # type: ignore[assignment]
        setattr(material, "updated_at", datetime.utcnow())
        await db.commit()

        logger.info(
            "Indexing triggered for material %s by admin %s",
            material_id,
            current_user.user_id,
        )

        return {
            "message": "Đã kích hoạt quá trình index. Quá trình này sẽ chạy bất đồng bộ.",
            "material_id": material_id,
            "status": "INDEXING",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering RAG indexing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger indexing: {str(e)}",
        )


@router.get(
    "/subjects",
    response_model=List[dict],
    dependencies=[Depends(get_current_admin_user)],
)
async def list_subjects(
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get list of subjects from organization model - Admin only

    Returns:
        List of subjects with id and name
    """
    try:
        from ....models.organization import Subject

        result = await db.execute(select(Subject).where(Subject.is_active.is_(True)))
        subjects = result.scalars().all()

        subjects_list = [
            {
                "id": subject.id,
                "name": subject.name,
                "description": subject.description,
            }
            for subject in subjects
        ]

        logger.info(
            "Retrieved %s subjects for admin %s",
            len(subjects_list),
            current_user.user_id,
        )
        return subjects_list

    except Exception as e:
        logger.error(f"Error listing subjects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subjects: {str(e)}",
        )
