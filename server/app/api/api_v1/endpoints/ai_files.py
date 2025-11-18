"""
AI Files API Endpoints

This module handles metadata management for files uploaded to Gemini File Search Store.
The actual file upload is handled by ai-server (Cloud Run), but we track metadata
(title, description, status, etc.) in our database.
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    Query,
)
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
import logging
import httpx
from datetime import datetime

from ....models.gemini_file import GeminiFile, FileSearchStatus
from ....models.library import LibrarySubject
from ....models.user import Profile
from ....schemas.admin import (
    AIDataItemResponse,
    AIDataStatsResponse,
)
from ....core.database import get_db_session_write, get_db_session_read
from ....core.config import settings
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_admin_user,
    security,
)

logger = logging.getLogger(__name__)
router = APIRouter()

QUOTA_LIMIT_MESSAGE = (
    "Không thể sử dụng thêm vì quá giới hạn sử dụng AI, vui lòng chờ trong giây lát rồi thử lại."
)


def _get_status_text(status: FileSearchStatus) -> str:
    """Convert status enum to Vietnamese text"""
    status_map = {
        FileSearchStatus.PENDING: "Chưa xử lý",
        FileSearchStatus.INDEXING: "Đang xử lý",
        FileSearchStatus.COMPLETED: "Đã xử lý",
        FileSearchStatus.FAILED: "Thất bại",
    }
    return status_map.get(status, "Chưa xử lý")


def _build_ai_data_response(
    gemini_file: GeminiFile, subject_name: Optional[str] = None
) -> AIDataItemResponse:
    """Build AIDataItemResponse from GeminiFile model"""
    return AIDataItemResponse(
        id=gemini_file.id,
        title=gemini_file.title,
        description=gemini_file.description,
        file_type=gemini_file.file_type,
        file_name=gemini_file.file_name,
        display_name=gemini_file.display_name,
        file_size=gemini_file.file_size,
        mime_type=gemini_file.mime_type,
        subject_id=gemini_file.subject_id,
        subject_name=subject_name,
        uploaded_by=gemini_file.uploaded_by,
        uploader_name=gemini_file.uploader_name,
        upload_date=gemini_file.uploaded_at,
        last_processed=gemini_file.indexed_at or gemini_file.updated_at,
        status=gemini_file.status.value,
        status_text=_get_status_text(gemini_file.status),
        tags=gemini_file.tags if isinstance(gemini_file.tags, list) else None,
        created_at=gemini_file.created_at,
        updated_at=gemini_file.updated_at,
        indexed_at=gemini_file.indexed_at,
    )


def _map_gemini_state_to_status(state: str) -> FileSearchStatus:
    upper_state = state.upper()
    if "ACTIVE" in upper_state:
        return FileSearchStatus.COMPLETED
    if "PROCESS" in upper_state or "PENDING" in upper_state:
        return FileSearchStatus.INDEXING
    if "FAILED" in upper_state or "ERROR" in upper_state:
        return FileSearchStatus.FAILED
    return FileSearchStatus.PENDING


async def _fetch_gemini_file_info(file_name: str) -> Optional[dict]:
    if not settings.GEMINI_API_KEY:
        return None
    api_url = f"https://generativelanguage.googleapis.com/v1beta/{file_name}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                api_url,
                params={"key": settings.GEMINI_API_KEY},
            )
        if response.status_code != 200:
            logger.warning(
                "Failed to fetch Gemini file %s (status %s, body: %s)",
                file_name,
                response.status_code,
                response.text,
            )
            return None
        return response.json()
    except Exception as e:
        logger.warning("Error fetching Gemini file info for %s: %s", file_name, e)
        return None


@router.get("/admin/ai-data", response_model=List[AIDataItemResponse])
async def list_ai_files(
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(
        None, description="Filter by status: PENDING, INDEXING, COMPLETED, FAILED"
    ),
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    db: AsyncSession = Depends(get_db_session_read),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    List all AI files (Gemini files) with metadata.
    Only accessible by admins.
    """
    try:
        # Build query
        query = select(GeminiFile)

        # Apply filters
        conditions = []
        if status_filter:
            try:
                status_enum = FileSearchStatus(status_filter.upper())
                conditions.append(GeminiFile.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status filter: {status_filter}. Must be one of: PENDING, INDEXING, COMPLETED, FAILED",
                )

        if subject_id:
            conditions.append(GeminiFile.subject_id == subject_id)

        if conditions:
            query = query.where(and_(*conditions))

        # Order by created_at desc
        query = query.order_by(GeminiFile.created_at.desc())

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Execute query
        result = await db.execute(query)
        gemini_files = result.scalars().all()

        # Get subject names
        subject_ids = {f.subject_id for f in gemini_files if f.subject_id}
        subject_map = {}
        if subject_ids:
            subject_query = select(LibrarySubject).where(
                LibrarySubject.id.in_(subject_ids)
            )
            subject_result = await db.execute(subject_query)
            subjects = subject_result.scalars().all()
            subject_map = {s.id: s.name for s in subjects}

        # Build response
        responses = []
        for gf in gemini_files:
            subject_name = subject_map.get(gf.subject_id) if gf.subject_id else None
            responses.append(_build_ai_data_response(gf, subject_name))

        return responses

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing AI files: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list AI files: {str(e)}",
        )


@router.get("/admin/ai-data/stats", response_model=AIDataStatsResponse)
async def get_ai_data_stats(
    db: AsyncSession = Depends(get_db_session_read),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    Get statistics about AI files.
    Only accessible by admins.
    """
    try:
        # Count by status
        total_query = select(func.count(GeminiFile.id))
        total_result = await db.execute(total_query)
        total_files = total_result.scalar() or 0

        completed_query = select(func.count(GeminiFile.id)).where(
            GeminiFile.status == FileSearchStatus.COMPLETED
        )
        completed_result = await db.execute(completed_query)
        completed_files = completed_result.scalar() or 0

        indexing_query = select(func.count(GeminiFile.id)).where(
            GeminiFile.status == FileSearchStatus.INDEXING
        )
        indexing_result = await db.execute(indexing_query)
        indexing_files = indexing_result.scalar() or 0

        pending_query = select(func.count(GeminiFile.id)).where(
            GeminiFile.status == FileSearchStatus.PENDING
        )
        pending_result = await db.execute(pending_query)
        pending_files = pending_result.scalar() or 0

        failed_query = select(func.count(GeminiFile.id)).where(
            GeminiFile.status == FileSearchStatus.FAILED
        )
        failed_result = await db.execute(failed_query)
        failed_files = failed_result.scalar() or 0

        return AIDataStatsResponse(
            total_materials=total_files,
            processed_materials=completed_files,
            processing_materials=indexing_files,
            pending_materials=pending_files,
            failed_materials=failed_files,
            # Also include original field names
            total_files=total_files,
            completed_files=completed_files,
            indexing_files=indexing_files,
            pending_files=pending_files,
            failed_files=failed_files,
        )

    except Exception as e:
        logger.error(f"Error getting AI data stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI data stats: {str(e)}",
        )


@router.post("/admin/ai-data/upload", response_model=AIDataItemResponse)
async def upload_ai_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    subject_id: Optional[str] = Form(None),  # Accept string, will convert to int
    tags: Optional[str] = Form(None),  # Comma-separated tags
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session_write),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    Upload a file to Gemini File Search Store via ai-server.

    Flow:
    1. Save metadata to database (status: PENDING)
    2. Call ai-server API to upload file
    3. Update metadata with file_name and status (INDEXING or COMPLETED)

    Only accessible by admins.
    """
    try:
        # Parse tags
        tag_list = None
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

        # Parse subject_id (convert string to int if provided)
        subject_id_int = None
        if subject_id:
            try:
                subject_id_int = int(subject_id)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid subject_id: {subject_id}. Must be a valid integer.",
                )

        # Get uploader info from profile
        uploader_name = current_user.email or "Unknown"
        # Try to get full_name from profile
        profile_query = select(Profile).where(Profile.id == current_user.user_id)
        profile_result = await db.execute(profile_query)
        profile = profile_result.scalar_one_or_none()
        if profile and profile.full_name:
            uploader_name = profile.full_name

        # Create metadata record in database (status: PENDING)
        gemini_file = GeminiFile(
            title=title,
            description=description,
            subject_id=subject_id_int,
            tags=tag_list,
            uploaded_by=current_user.user_id,
            uploader_name=uploader_name,
            status=FileSearchStatus.PENDING,
            file_type=file.filename.split(".")[-1]
            if file.filename and "." in file.filename
            else None,
            mime_type=file.content_type,
        )

        # Read file content to get size
        file_content = await file.read()
        file_size = len(file_content)
        gemini_file.file_size = file_size

        # Save to database
        db.add(gemini_file)
        await db.flush()  # Get ID without committing
        await db.refresh(gemini_file)

        # Call ai-server to upload file
        ai_server_url = settings.AI_SERVER_URL.rstrip("/")
        upload_url = f"{ai_server_url}/api/v1/files/upload"

        # Prepare file for upload (reset file pointer)
        await file.seek(0)

        # Prepare form data
        files_data = {
            "file": (
                file.filename or "uploaded_file",
                file_content,
                file.content_type or "application/octet-stream",
            )
        }
        form_data = {
            "display_name": title,
        }

        try:
            # Get JWT token from credentials
            token = credentials.credentials

            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    upload_url,
                    files=files_data,
                    data=form_data,
                    headers={
                        "Authorization": f"Bearer {token}",
                    },
                )

            if response.status_code not in [200, 201]:
                # Upload failed - update status to FAILED
                gemini_file.status = FileSearchStatus.FAILED
                await db.commit()

                error_detail = response.text
                logger.error(
                    f"Failed to upload to ai-server: {response.status_code} - {error_detail}"
                )
                if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=QUOTA_LIMIT_MESSAGE,
                    )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload file to ai-server: {error_detail}",
                )

            # Parse response from ai-server
            upload_response = response.json()
            gemini_file.file_name = upload_response.get("file_name") or upload_response.get(
                "file", {}
            ).get("name")
            gemini_file.display_name = upload_response.get("file_name") or title
            gemini_file.operation_name = upload_response.get("operation_name")

            # Try to fetch remote status immediately if Gemini returned file_name
            remote_state_applied = False
            if gemini_file.file_name:
                file_info = await _fetch_gemini_file_info(gemini_file.file_name)
                if file_info:
                    remote_state_applied = True
                    remote_status = _map_gemini_state_to_status(file_info.get("state", ""))
                    gemini_file.status = remote_status
                    if remote_status == FileSearchStatus.COMPLETED:
                        gemini_file.indexed_at = datetime.utcnow()
                        gemini_file.display_name = file_info.get(
                            "displayName", gemini_file.display_name
                        )
                        size_bytes = file_info.get("sizeBytes")
                        if isinstance(size_bytes, int):
                            gemini_file.file_size = size_bytes

            # Fallback status if we could not fetch remote info
            if not remote_state_applied:
                if upload_response.get("operation_name"):
                    gemini_file.status = FileSearchStatus.INDEXING
                else:
                    gemini_file.status = FileSearchStatus.COMPLETED
                    gemini_file.indexed_at = datetime.utcnow()

            await db.commit()
            await db.refresh(gemini_file)

            # Get subject name if available
            subject_name = None
            if gemini_file.subject_id:
                subject_query = select(LibrarySubject).where(
                    LibrarySubject.id == gemini_file.subject_id
                )
                subject_result = await db.execute(subject_query)
                subject = subject_result.scalar_one_or_none()
                if subject:
                    subject_name = subject.name

            return _build_ai_data_response(gemini_file, subject_name)

        except httpx.TimeoutException:
            gemini_file.status = FileSearchStatus.FAILED
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Upload to ai-server timed out",
            )
        except httpx.RequestError as e:
            gemini_file.status = FileSearchStatus.FAILED
            await db.commit()
            logger.error(f"Error calling ai-server: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to ai-server: {str(e)}",
            )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error uploading AI file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload AI file: {str(e)}",
        )


@router.post("/admin/ai-data/{file_id}/index", response_model=AIDataItemResponse)
async def trigger_indexing(
    file_id: int,
    db: AsyncSession = Depends(get_db_session_write),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    Trigger indexing for a file (check status from ai-server).
    Only accessible by admins.
    """
    try:
        # Get file from database
        query = select(GeminiFile).where(GeminiFile.id == file_id)
        result = await db.execute(query)
        gemini_file = result.scalar_one_or_none()

        if not gemini_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File with id {file_id} not found",
            )

        # Refresh status from Gemini if we know the file name
        if gemini_file.file_name:
            file_info = await _fetch_gemini_file_info(gemini_file.file_name)
            if file_info:
                gemini_state = file_info.get("state") or ""
                gemini_file.status = _map_gemini_state_to_status(gemini_state)
                if gemini_file.status == FileSearchStatus.COMPLETED:
                    gemini_file.indexed_at = datetime.utcnow()
                    gemini_file.display_name = file_info.get(
                        "displayName", gemini_file.display_name
                    )
                    size_bytes = file_info.get("sizeBytes")
                    if isinstance(size_bytes, int):
                        gemini_file.file_size = size_bytes
                await db.commit()
                await db.refresh(gemini_file)
        elif gemini_file.status == FileSearchStatus.PENDING:
            # Without file name we can only move to INDEXING
            gemini_file.status = FileSearchStatus.INDEXING
            await db.commit()
            await db.refresh(gemini_file)

        # Get subject name if available
        subject_name = None
        if gemini_file.subject_id:
            subject_query = select(LibrarySubject).where(
                LibrarySubject.id == gemini_file.subject_id
            )
            subject_result = await db.execute(subject_query)
            subject = subject_result.scalar_one_or_none()
            if subject:
                subject_name = subject.name

        return _build_ai_data_response(gemini_file, subject_name)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering indexing: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger indexing: {str(e)}",
        )


@router.get("/admin/ai-data/files", response_model=List[AIDataItemResponse])
async def list_gemini_files(
    db: AsyncSession = Depends(get_db_session_read),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    List all files from Gemini File Search Store.
    This endpoint fetches files directly from Gemini API and merges with database metadata.
    Only accessible by admins.
    """
    try:
        # Check if GEMINI_API_KEY is configured
        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GEMINI_API_KEY not configured",
            )

        # Call Gemini REST API to list files
        # According to: https://ai.google.dev/api/all-methods
        # GET /v1beta/files?key=API_KEY
        api_url = "https://generativelanguage.googleapis.com/v1beta/files"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                api_url,
                params={"key": settings.GEMINI_API_KEY},
            )

        if response.status_code != 200:
            error_detail = response.text
            logger.error(
                f"Failed to list files from Gemini: {response.status_code} - {error_detail}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list files from Gemini: {error_detail}",
            )

        gemini_files_data = response.json()
        files_list = gemini_files_data.get("files", [])

        # Get all files from database to merge metadata
        db_query = select(GeminiFile)
        db_result = await db.execute(db_query)
        db_files = db_result.scalars().all()

        # Create a map of file_name -> GeminiFile for quick lookup
        db_files_map = {f.file_name: f for f in db_files if f.file_name}

        # Get subject names
        subject_ids = {f.subject_id for f in db_files if f.subject_id}
        subject_map = {}
        if subject_ids:
            subject_query = select(LibrarySubject).where(
                LibrarySubject.id.in_(subject_ids)
            )
            subject_result = await db.execute(subject_query)
            subjects = subject_result.scalars().all()
            subject_map = {s.id: s.name for s in subjects}

        # Merge Gemini files with database metadata
        merged_responses = []
        for gemini_file_data in files_list:
            file_name = gemini_file_data.get("name")  # e.g., "files/abc123"
            display_name = gemini_file_data.get("displayName")
            remote_state = gemini_file_data.get("state") or ""
            remote_status = _map_gemini_state_to_status(remote_state)
            
            # Try to find matching database record
            db_file = db_files_map.get(file_name)
            
            if db_file:
                # Use database metadata (has title, description, tags, etc.)
                subject_name = subject_map.get(db_file.subject_id) if db_file.subject_id else None
                merged_responses.append(_build_ai_data_response(db_file, subject_name))
            else:
                # File exists in Gemini but not in database - create a minimal response
                # This can happen if file was uploaded directly to Gemini
                merged_responses.append(
                    AIDataItemResponse(
                        id=0,  # No database ID
                        title=display_name or file_name or "Unknown",
                        description=None,
                        file_type=None,
                        file_name=file_name,
                        display_name=display_name,
                        file_size=gemini_file_data.get("sizeBytes"),
                        mime_type=gemini_file_data.get("mimeType"),
                        subject_id=None,
                        subject_name=None,
                        uploaded_by=None,
                        uploader_name=None,
                        upload_date=datetime.fromisoformat(
                            gemini_file_data.get("createTime", "").replace("Z", "+00:00")
                        ) if gemini_file_data.get("createTime") else None,
                        last_processed=None,
                        status=remote_status.value,
                        status_text=_get_status_text(remote_status),
                        tags=None,
                        created_at=datetime.fromisoformat(
                            gemini_file_data.get("createTime", "").replace("Z", "+00:00")
                        ) if gemini_file_data.get("createTime") else None,
                        updated_at=None,
                        indexed_at=None,
                    )
                )

        # Sort by created_at desc
        merged_responses.sort(
            key=lambda x: x.created_at or datetime.min, reverse=True
        )

        return merged_responses

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing Gemini files: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list Gemini files: {str(e)}",
        )


@router.delete("/admin/ai-data/files/{file_id}")
async def delete_gemini_file(
    file_id: int,
    db: AsyncSession = Depends(get_db_session_write),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    Delete a file from both Gemini File Search Store and database.
    Only accessible by admins.
    """
    try:
        # Get file from database
        query = select(GeminiFile).where(GeminiFile.id == file_id)
        result = await db.execute(query)
        gemini_file = result.scalar_one_or_none()

        if not gemini_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File with id {file_id} not found",
            )

        # Check if file has file_name (Gemini file name)
        if not gemini_file.file_name:
            # File not uploaded to Gemini yet, just delete from database
            await db.delete(gemini_file)
            await db.commit()
            return {"success": True, "message": "File deleted from database"}

        # Check if GEMINI_API_KEY is configured
        if not settings.GEMINI_API_KEY:
            # If no API key, just delete from database
            logger.warning("GEMINI_API_KEY not configured, deleting from database only")
            await db.delete(gemini_file)
            await db.commit()
            return {"success": True, "message": "File deleted from database (Gemini API not configured)"}

        # Delete from Gemini File Search Store using REST API
        # According to: https://ai.google.dev/api/all-methods
        # DELETE /v1beta/{name}?key=API_KEY
        api_url = f"https://generativelanguage.googleapis.com/v1beta/{gemini_file.file_name}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                api_url,
                params={"key": settings.GEMINI_API_KEY},
            )

        # Handle response
        if response.status_code not in [200, 204]:
            error_detail = response.text
            logger.error(
                f"Failed to delete file from Gemini: {response.status_code} - {error_detail}"
            )
            # Even if Gemini deletion fails, delete from database
            # (file might have been deleted manually from Gemini)
            await db.delete(gemini_file)
            await db.commit()
            return {
                "success": True,
                "message": f"File deleted from database. Warning: Failed to delete from Gemini: {error_detail}",
            }

        # Delete from database
        await db.delete(gemini_file)
        await db.commit()

        return {"success": True, "message": "File deleted successfully from Gemini and database"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting Gemini file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete Gemini file: {str(e)}",
        )