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
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload file to ai-server: {error_detail}",
                )

            # Parse response from ai-server
            upload_response = response.json()
            gemini_file.file_name = upload_response.get("file_name")
            gemini_file.display_name = upload_response.get("file_name") or title
            gemini_file.operation_name = upload_response.get("operation_name")

            # Update status based on response
            if upload_response.get("operation_name"):
                # Long-running operation - status is INDEXING
                gemini_file.status = FileSearchStatus.INDEXING
            else:
                # Immediate completion - status is COMPLETED
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

        # If file has operation_name, check status from ai-server
        # For now, we'll just update status locally if it was PENDING
        # TODO: In the future, we can call ai-server's status endpoint to check actual status
        if gemini_file.status == FileSearchStatus.PENDING:
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
