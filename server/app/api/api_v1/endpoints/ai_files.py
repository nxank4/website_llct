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
import re
import unicodedata
import asyncio
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

QUOTA_LIMIT_MESSAGE = "Không thể sử dụng thêm vì quá giới hạn sử dụng AI, vui lòng chờ trong giây lát rồi thử lại."


def _normalize_filename(filename: str) -> str:
    """
    Chuẩn hóa tên file tiếng Việt thành tên file dễ search và gọn gàng.
    Loại bỏ dấu, ký tự đặc biệt, chuyển thành slug.
    """
    if not filename:
        return "file"

    # Lấy tên file không có extension
    if "." in filename:
        name_without_ext, extension = filename.rsplit(".", 1)
    else:
        name_without_ext = filename
        extension = ""

    # Chuyển đổi tiếng Việt có dấu thành không dấu
    # Sử dụng unicodedata để normalize
    normalized = unicodedata.normalize("NFD", name_without_ext)
    # Loại bỏ các ký tự combining (dấu)
    normalized = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )

    # Chuyển đổi đặc biệt cho một số ký tự tiếng Việt
    vietnamese_replacements = {
        "đ": "d",
        "Đ": "D",
    }
    for old_char, new_char in vietnamese_replacements.items():
        normalized = normalized.replace(old_char, new_char)

    # Loại bỏ ký tự đặc biệt, chỉ giữ chữ, số, dấu gạch ngang và gạch dưới
    normalized = re.sub(r"[^a-zA-Z0-9_-]", "-", normalized)

    # Loại bỏ nhiều dấu gạch ngang liên tiếp
    normalized = re.sub(r"-+", "-", normalized)

    # Loại bỏ dấu gạch ngang ở đầu và cuối
    normalized = normalized.strip("-")

    # Nếu sau khi normalize mà rỗng, dùng tên mặc định
    if not normalized:
        normalized = "file"

    # Giới hạn độ dài tên file (tối đa 100 ký tự)
    if len(normalized) > 100:
        normalized = normalized[:100]

    # Thêm extension nếu có
    if extension:
        return f"{normalized}.{extension}"
    return normalized


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
        id=gemini_file.id,  # type: ignore
        title=gemini_file.title,  # type: ignore
        description=gemini_file.description,  # type: ignore
        file_type=gemini_file.file_type,  # type: ignore
        file_name=gemini_file.file_name,  # type: ignore
        display_name=gemini_file.display_name,  # type: ignore
        file_size=gemini_file.file_size,  # type: ignore
        mime_type=gemini_file.mime_type,  # type: ignore
        subject_id=gemini_file.subject_id,  # type: ignore
        subject_name=subject_name,
        uploaded_by=gemini_file.uploaded_by,  # type: ignore
        uploader_name=gemini_file.uploader_name,  # type: ignore
        upload_date=gemini_file.uploaded_at,  # type: ignore
        last_processed=gemini_file.indexed_at or gemini_file.updated_at,  # type: ignore
        status=gemini_file.status.value,  # type: ignore
        status_text=_get_status_text(gemini_file.status),  # type: ignore
        tags=gemini_file.tags if isinstance(gemini_file.tags, list) else None,  # type: ignore
        created_at=gemini_file.created_at,  # type: ignore
        updated_at=gemini_file.updated_at,  # type: ignore
        indexed_at=gemini_file.indexed_at,  # type: ignore
    )


def _map_gemini_state_to_status(state: str) -> FileSearchStatus:
    """
    Map Gemini File Search state to our status enum.

    Gemini states:
    - ACTIVE: File is indexed and ready for search (COMPLETED)
    - PROCESSING: File is being indexed (INDEXING)
    - PENDING: File upload pending (INDEXING)
    - FAILED: Upload or indexing failed (FAILED)
    """
    if not state:
        return FileSearchStatus.PENDING

    upper_state = state.upper().strip()

    # Check for COMPLETED states first (most specific)
    if upper_state == "ACTIVE" or "ACTIVE" in upper_state:
        return FileSearchStatus.COMPLETED

    # Check for FAILED states
    if "FAILED" in upper_state or "ERROR" in upper_state:
        return FileSearchStatus.FAILED

    # Check for INDEXING states
    if "PROCESSING" in upper_state or "PROCESS" in upper_state:
        return FileSearchStatus.INDEXING

    if "PENDING" in upper_state:
        return FileSearchStatus.INDEXING

    # Default to PENDING if unknown
    logger.warning(f"Unknown Gemini state '{state}', defaulting to PENDING")
    return FileSearchStatus.PENDING


async def _poll_gemini_operation(operation_name: str) -> Optional[dict]:
    """
    Poll a Gemini long-running operation to get file metadata once indexing completes.

    Returns:
        dict with file info from operation response, or None if operation not done or failed.
    """
    gemini_api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not gemini_api_key:
        return None

    poll_url = f"https://generativelanguage.googleapis.com/v1beta/{operation_name}"
    # Poll up to 6 times with increasing delays
    for attempt in range(6):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(
                    poll_url,
                    params={"key": gemini_api_key},
                )
            if response.status_code != 200:
                logger.warning(
                    "Failed to poll operation %s (status %s, attempt %d)",
                    operation_name,
                    response.status_code,
                    attempt + 1,
                )
                if attempt < 5:
                    await asyncio.sleep(min(8, 2 + attempt))
                    continue
                return None

            op_data = response.json()
            if op_data.get("done"):
                # Operation completed, check for document (File Search Store API) or file (legacy API)
                response_data = op_data.get("response", {})
                # File Search Store API returns document
                document_metadata = response_data.get("document")
                # Legacy API returns file
                file_metadata = response_data.get("file")

                if document_metadata:
                    logger.info(
                        "Operation %s completed. Retrieved document metadata from File Search Store.",
                        operation_name,
                    )
                    return document_metadata
                elif file_metadata:
                    logger.info(
                        "Operation %s completed. Retrieved file metadata (legacy API).",
                        operation_name,
                    )
                    return file_metadata
                elif response_data.get("documentName"):
                    # File Search Store API returns documentName instead of full document object
                    # Create a document-like object from documentName and available metadata
                    document_name = response_data.get("documentName")
                    logger.info(
                        "Operation %s completed. Got documentName: %s. Fetching document info...",
                        operation_name,
                        document_name,
                    )
                    # Fetch full document info using documentName
                    gemini_api_key = getattr(settings, "GEMINI_API_KEY", None)
                    if gemini_api_key:
                        try:
                            doc_url = f"https://generativelanguage.googleapis.com/v1beta/{document_name}"
                            async with httpx.AsyncClient(timeout=20.0) as client:
                                doc_response = await client.get(
                                    doc_url,
                                    params={"key": gemini_api_key},
                                )
                            if doc_response.status_code == 200:
                                doc_info = doc_response.json()
                                logger.info(
                                    "Successfully fetched document info for %s",
                                    document_name,
                                )
                                return doc_info
                            else:
                                logger.warning(
                                    "Failed to fetch document info for %s (status %s). Creating from documentName.",
                                    document_name,
                                    doc_response.status_code,
                                )
                        except Exception as e:
                            logger.warning(
                                "Error fetching document info for %s: %s. Creating from documentName.",
                                document_name,
                                e,
                            )

                    # Fallback: create document-like object from documentName
                    size_bytes = response_data.get("sizeBytes")
                    if size_bytes:
                        try:
                            # sizeBytes might be a string, convert to int
                            size_bytes = int(str(size_bytes))
                        except (ValueError, TypeError):
                            size_bytes = None

                    return {
                        "name": document_name,
                        "displayName": response_data.get("displayName"),
                        "sizeBytes": size_bytes,
                        "mimeType": response_data.get("mimeType"),
                        "state": "ACTIVE",  # Assume ACTIVE if operation is done
                    }
                else:
                    logger.warning(
                        "Operation %s done but no document, file, or documentName in response: %s",
                        operation_name,
                        response_data,
                    )
                    return None
            else:
                # Operation still running, wait and retry
                if attempt < 5:
                    await asyncio.sleep(min(8, 2 + attempt))
                    continue
                # Last attempt, operation still not done
                logger.info(
                    "Operation %s still running after %d attempts",
                    operation_name,
                    attempt + 1,
                )
                return None
        except Exception as poll_error:
            logger.warning(
                "Error while polling operation %s (attempt %d): %s",
                operation_name,
                attempt + 1,
                poll_error,
            )
            if attempt < 5:
                await asyncio.sleep(min(8, 2 + attempt))
                continue
    return None


async def _fetch_gemini_file_info(file_name: str) -> Optional[dict]:
    """
    Fetch file/document information from Gemini File Search API.

    Supports both:
    - File Search Store Documents API: documents/{documentName}
    - Legacy Files API: files/{fileId}

    Returns:
        dict with file/document info including 'state', 'displayName', 'sizeBytes', etc.
        None if fetch failed or API key not configured.
    """
    gemini_api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not gemini_api_key:
        return None

    # Try File Search Store Documents API first if FILE_SEARCH_STORE_NAME is configured
    file_search_store_name = getattr(settings, "FILE_SEARCH_STORE_NAME", None)
    if file_search_store_name and file_name.startswith("documents/"):
        # Already a document name, use Documents API
        api_url = f"https://generativelanguage.googleapis.com/v1beta/{file_search_store_name}/{file_name}"
    elif file_search_store_name and not file_name.startswith("files/"):
        # Assume it's a document name without prefix
        api_url = f"https://generativelanguage.googleapis.com/v1beta/{file_search_store_name}/documents/{file_name}"
    else:
        # Use legacy Files API
        api_url = f"https://generativelanguage.googleapis.com/v1beta/{file_name}"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                api_url,
                params={"key": gemini_api_key},
            )
        if response.status_code != 200:
            logger.warning(
                "Failed to fetch Gemini file/document %s (status %s)",
                file_name,
                response.status_code,
            )
            return None

        return response.json()
    except Exception as e:
        logger.error(f"Error fetching Gemini file/document info for {file_name}: {e}")
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
        subject_ids = {f.subject_id for f in gemini_files if f.subject_id is not None}
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
            subject_name: Optional[str] = None
            if gf.subject_id is not None:
                subject_name = subject_map.get(gf.subject_id)  # type: ignore
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
        if profile is not None and profile.full_name is not None:
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
        gemini_file.file_size = file_size  # type: ignore

        # Save to database
        db.add(gemini_file)
        await db.flush()  # Get ID without committing
        await db.refresh(gemini_file)

        # Call ai-server to upload file
        ai_server_url = settings.AI_SERVER_URL.rstrip("/")
        upload_url = f"{ai_server_url}/api/v1/files/upload"

        # Prepare file for upload (reset file pointer)
        await file.seek(0)

        # Chuẩn hóa tên file trước khi upload
        original_filename = file.filename or "uploaded_file"
        normalized_filename = _normalize_filename(original_filename)

        # Prepare form data
        files_data = {
            "file": (
                normalized_filename,
                file_content,
                file.content_type or "application/octet-stream",
            )
        }
        # Sử dụng title đã normalize (hoặc normalize title) cho display_name
        normalized_display_name = _normalize_filename(title)
        form_data = {
            "display_name": normalized_display_name,
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
                gemini_file.status = FileSearchStatus.FAILED  # type: ignore
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
            file_name_from_response = upload_response.get(
                "file_name"
            ) or upload_response.get("file", {}).get("name")
            if file_name_from_response:
                gemini_file.file_name = file_name_from_response  # type: ignore
            display_name_from_response = upload_response.get("file_name") or title
            if display_name_from_response:
                gemini_file.display_name = display_name_from_response  # type: ignore
            operation_name_from_response = upload_response.get("operation_name")
            if operation_name_from_response:
                gemini_file.operation_name = operation_name_from_response  # type: ignore

            # Try to fetch remote status immediately if Gemini returned file_name
            remote_state_applied = False
            if gemini_file.file_name is not None:
                file_info = await _fetch_gemini_file_info(str(gemini_file.file_name))
                if file_info:
                    remote_state_applied = True
                    gemini_state = file_info.get("state", "")
                    remote_status = _map_gemini_state_to_status(gemini_state)
                    gemini_file.status = remote_status  # type: ignore
                    if remote_status == FileSearchStatus.COMPLETED:
                        gemini_file.indexed_at = datetime.utcnow()  # type: ignore
                        display_name_from_info = file_info.get("displayName")
                        if display_name_from_info:
                            gemini_file.display_name = display_name_from_info  # type: ignore
                        size_bytes = file_info.get("sizeBytes")
                        if isinstance(size_bytes, int):
                            gemini_file.file_size = size_bytes  # type: ignore

            # Fallback status if we could not fetch remote info
            if not remote_state_applied:
                operation_name = upload_response.get("operation_name")
                if operation_name:
                    gemini_file.status = FileSearchStatus.INDEXING  # type: ignore
                else:
                    gemini_file.status = FileSearchStatus.COMPLETED  # type: ignore
                    gemini_file.indexed_at = datetime.utcnow()  # type: ignore

            await db.commit()
            await db.refresh(gemini_file)

            # Get subject name if available
            subject_name: Optional[str] = None
            if gemini_file.subject_id is not None:
                subject_query = select(LibrarySubject).where(
                    LibrarySubject.id == gemini_file.subject_id
                )
                subject_result = await db.execute(subject_query)
                subject = subject_result.scalar_one_or_none()
                if subject is not None:
                    subject_name = subject.name  # type: ignore

            return _build_ai_data_response(gemini_file, subject_name)

        except httpx.TimeoutException:
            gemini_file.status = FileSearchStatus.FAILED  # type: ignore
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Upload to ai-server timed out",
            )
        except httpx.RequestError as e:
            gemini_file.status = FileSearchStatus.FAILED  # type: ignore
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

        # If we have an operation_name but no file_name, poll the operation first
        operation_name_str = (
            str(gemini_file.operation_name)
            if gemini_file.operation_name is not None
            else None
        )
        file_name_str = (
            str(gemini_file.file_name) if gemini_file.file_name is not None else None
        )

        if operation_name_str and not file_name_str:
            logger.info(f"Polling operation {operation_name_str} for file_id={file_id}")
            file_metadata = await _poll_gemini_operation(operation_name_str)
            if file_metadata:
                # Operation completed, update file_name/document_name and other metadata
                # File Search Store API returns document with name like "documents/{documentId}"
                # Legacy API returns file with name like "files/{fileId}"
                name_from_metadata = file_metadata.get("name")
                if name_from_metadata:
                    gemini_file.file_name = name_from_metadata  # type: ignore
                display_name_from_metadata = file_metadata.get("displayName")
                if display_name_from_metadata:
                    gemini_file.display_name = display_name_from_metadata  # type: ignore
                size_bytes = file_metadata.get("sizeBytes")
                if size_bytes is not None:
                    try:
                        # sizeBytes might be a string, convert to int
                        size_bytes_int = int(str(size_bytes))
                        gemini_file.file_size = size_bytes_int  # type: ignore
                    except (ValueError, TypeError):
                        logger.warning(
                            f"Invalid sizeBytes value for file_id={file_id}: {size_bytes}"
                        )
                # Check state from operation response
                # File Search Store documents may not have "state" field, assume COMPLETED if operation done
                gemini_state = file_metadata.get("state") or ""
                if not gemini_state and name_from_metadata:
                    # If no state but we have document name, assume it's completed
                    new_status = FileSearchStatus.COMPLETED
                else:
                    new_status = _map_gemini_state_to_status(gemini_state)
                gemini_file.status = new_status  # type: ignore
                if new_status == FileSearchStatus.COMPLETED:
                    gemini_file.indexed_at = datetime.utcnow()  # type: ignore
                await db.commit()
                await db.refresh(gemini_file)
            else:
                # Operation still running or failed, keep INDEXING status
                logger.info(
                    f"Operation {operation_name_str} still running for file_id={file_id}"
                )
                gemini_file.status = FileSearchStatus.INDEXING  # type: ignore
                await db.commit()
                await db.refresh(gemini_file)

        # Refresh status from Gemini if we know the file/document name
        if file_name_str:
            file_info = await _fetch_gemini_file_info(file_name_str)
            if file_info:
                # File Search Store documents may not have "state" field
                # If document exists and no state, assume COMPLETED
                gemini_state = file_info.get("state") or ""
                if not gemini_state and file_name_str.startswith("documents/"):
                    new_status = FileSearchStatus.COMPLETED
                else:
                    new_status = _map_gemini_state_to_status(gemini_state)
                logger.info(
                    f"Refreshed status from Gemini for file_id={file_id}, "
                    f"file_name={file_name_str}, state={gemini_state or 'N/A (document)'}, "
                    f"mapped_status={new_status.value}, old_status={gemini_file.status.value}"
                )
                gemini_file.status = new_status  # type: ignore
                if new_status == FileSearchStatus.COMPLETED:
                    gemini_file.indexed_at = datetime.utcnow()  # type: ignore
                    display_name_from_info = file_info.get("displayName")
                    if display_name_from_info:
                        gemini_file.display_name = display_name_from_info  # type: ignore
                    size_bytes = file_info.get("sizeBytes")
                    if isinstance(size_bytes, int):
                        gemini_file.file_size = size_bytes  # type: ignore
                await db.commit()
                await db.refresh(gemini_file)
            else:
                logger.warning(
                    f"Could not fetch file/document info from Gemini for file_id={file_id}, "
                    f"file_name={file_name_str}"
                )
        elif (
            gemini_file.status
            in [
                FileSearchStatus.PENDING,
                FileSearchStatus.INDEXING,
            ]
            and gemini_file.operation_name is None
        ):
            # Nếu không có file_name, thử tìm file trong Gemini bằng display_name hoặc title
            display_name_val: Optional[str] = (
                gemini_file.display_name
                if gemini_file.display_name is not None
                else None
            )  # type: ignore
            title_val: Optional[str] = (
                gemini_file.title if gemini_file.title is not None else None
            )  # type: ignore
            if display_name_val is not None or title_val is not None:
                search_name = str(display_name_val or title_val or "")
                # List files từ Gemini để tìm file đã tồn tại
                try:
                    gemini_api_key = getattr(settings, "GEMINI_API_KEY", None)
                    if gemini_api_key:
                        api_url = (
                            "https://generativelanguage.googleapis.com/v1beta/files"
                        )
                        async with httpx.AsyncClient(timeout=20.0) as client:
                            response = await client.get(
                                api_url,
                                params={"key": gemini_api_key},
                            )
                        if response.status_code == 200:
                            gemini_files_data = response.json()
                            files_list = gemini_files_data.get("files", [])
                            # Tìm file theo displayName hoặc name
                            matched_file = None
                            normalized_search = _normalize_filename(str(search_name))
                            for gf in files_list:
                                display_name = gf.get("displayName", "")
                                # So sánh với display_name hoặc title đã normalize
                                if (
                                    display_name == search_name
                                    or display_name == normalized_search
                                    or _normalize_filename(display_name)
                                    == normalized_search
                                ):
                                    matched_file = gf
                                    break

                            if matched_file:
                                # Tìm thấy file trong Gemini, cập nhật file_name và status
                                file_name_from_match = matched_file.get("name")
                                if file_name_from_match:
                                    gemini_file.file_name = file_name_from_match  # type: ignore
                                gemini_state = matched_file.get("state") or ""
                                new_status = _map_gemini_state_to_status(gemini_state)
                                logger.info(
                                    f"Found file in Gemini for file_id={file_id}: "
                                    f"state={gemini_state}, mapped_status={new_status.value}"
                                )
                                gemini_file.status = new_status  # type: ignore
                                if new_status == FileSearchStatus.COMPLETED:
                                    gemini_file.indexed_at = datetime.utcnow()  # type: ignore
                                    display_name_from_match = matched_file.get(
                                        "displayName"
                                    )
                                    if display_name_from_match:
                                        gemini_file.display_name = (
                                            display_name_from_match  # type: ignore
                                        )
                                    size_bytes = matched_file.get("sizeBytes")
                                    if isinstance(size_bytes, int):
                                        gemini_file.file_size = size_bytes  # type: ignore
                                await db.commit()
                                await db.refresh(gemini_file)
                            else:
                                # Không tìm thấy file trong Gemini
                                logger.warning(
                                    f"File not found in Gemini for file_id={file_id}, "
                                    f"search_name={search_name}, normalized={normalized_search}, "
                                    f"total_files_in_gemini={len(files_list)}"
                                )
                                # Không thay đổi status, giữ nguyên INDEXING
                                # (có thể file đang được xử lý)
                                await db.commit()
                                await db.refresh(gemini_file)
                except Exception as e:
                    logger.warning(
                        f"Error checking Gemini files for {search_name}: {e}"
                    )
                    # Nếu lỗi, chuyển sang INDEXING
                    gemini_file.status = FileSearchStatus.INDEXING  # type: ignore
                    await db.commit()
                    await db.refresh(gemini_file)
            else:
                # Không có display_name hoặc title, chỉ chuyển sang INDEXING
                gemini_file.status = FileSearchStatus.INDEXING  # type: ignore
                await db.commit()
                await db.refresh(gemini_file)

        # Get subject name if available
        subject_name: Optional[str] = None
        if gemini_file.subject_id is not None:
            subject_query = select(LibrarySubject).where(
                LibrarySubject.id == gemini_file.subject_id
            )
            subject_result = await db.execute(subject_query)
            subject = subject_result.scalar_one_or_none()
            if subject is not None:
                subject_name = subject.name  # type: ignore

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
        gemini_api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not gemini_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GEMINI_API_KEY not configured. Please set GEMINI_API_KEY in environment variables.",
            )

        # Call Gemini REST API to list files/documents
        # Try File Search Store Documents API first if FILE_SEARCH_STORE_NAME is configured
        file_search_store_name = getattr(settings, "FILE_SEARCH_STORE_NAME", None)
        files_list = []

        if file_search_store_name:
            # Use File Search Store Documents API
            # GET /v1beta/{fileSearchStoreName}/documents?key=API_KEY
            api_url = f"https://generativelanguage.googleapis.com/v1beta/{file_search_store_name}/documents"
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        api_url,
                        params={"key": gemini_api_key},
                    )
                if response.status_code == 200:
                    documents_data = response.json()
                    files_list = documents_data.get("documents", [])
                    logger.info(
                        f"Listed {len(files_list)} documents from File Search Store"
                    )
                else:
                    logger.warning(
                        f"Failed to list documents from File Search Store: {response.status_code} - {response.text}"
                    )
            except Exception as e:
                logger.warning(f"Error listing documents from File Search Store: {e}")

        # Fallback to legacy Files API if Documents API failed or not configured
        if not files_list:
            # Use legacy Files API
            # GET /v1beta/files?key=API_KEY
            api_url = "https://generativelanguage.googleapis.com/v1beta/files"
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    api_url,
                    params={"key": gemini_api_key},
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
            logger.info(f"Listed {len(files_list)} files from legacy Files API")

        # Get all files from database to merge metadata
        db_query = select(GeminiFile)
        db_result = await db.execute(db_query)
        db_files = db_result.scalars().all()

        # Create a map of file_name -> GeminiFile for quick lookup
        db_files_map = {f.file_name: f for f in db_files if f.file_name is not None}

        # Get subject names
        subject_ids = {f.subject_id for f in db_files if f.subject_id is not None}
        subject_map = {}
        if subject_ids:
            subject_query = select(LibrarySubject).where(
                LibrarySubject.id.in_(subject_ids)
            )
            subject_result = await db.execute(subject_query)
            subjects = subject_result.scalars().all()
            subject_map = {s.id: s.name for s in subjects}

        # Merge Gemini files/documents with database metadata
        # Only return files that exist in database (to avoid showing deleted files)
        merged_responses = []
        for gemini_file_data in files_list:
            file_name = gemini_file_data.get(
                "name"
            )  # e.g., "files/abc123" or "documents/abc123"

            # Try to find matching database record
            db_file = db_files_map.get(file_name)

            # Only include files that exist in database
            # This ensures deleted files are not shown, even if they still exist in Gemini
            if db_file:
                # Use database metadata (has title, description, tags, etc.)
                subject_name: Optional[str] = None
                if db_file.subject_id is not None:
                    subject_name = subject_map.get(db_file.subject_id)  # type: ignore
                merged_responses.append(_build_ai_data_response(db_file, subject_name))
            # Removed else block: files in Gemini but not in database are not returned
            # This prevents showing files that were deleted from the database

        # Sort by created_at desc
        merged_responses.sort(key=lambda x: x.created_at or datetime.min, reverse=True)

        return merged_responses

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error listing Gemini files: {error_msg}", exc_info=True)
        # Provide more specific error message
        if "GEMINI_API_KEY" in error_msg or "not configured" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GEMINI_API_KEY not configured. Please configure the API key to list files.",
            )
        elif "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Request to Gemini API timed out. Please try again later.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list Gemini files: {error_msg}",
            )


@router.get("/admin/ai-data/{file_id}", response_model=AIDataItemResponse)
async def get_ai_file_detail(
    file_id: int,
    db: AsyncSession = Depends(get_db_session_read),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    Get detailed information about a specific AI file (Gemini file).
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

        # Get subject name if subject_id exists
        subject_name: Optional[str] = None
        if gemini_file.subject_id is not None:
            subject_query = select(LibrarySubject).where(
                LibrarySubject.id == gemini_file.subject_id
            )
            subject_result = await db.execute(subject_query)
            subject = subject_result.scalar_one_or_none()
            if subject:
                subject_name = subject.name  # type: ignore

        return _build_ai_data_response(gemini_file, subject_name)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI file detail: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI file detail: {str(e)}",
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
        if gemini_file.file_name is None:
            # File not uploaded to Gemini yet, just delete from database
            await db.delete(gemini_file)
            await db.commit()
            return {"success": True, "message": "File deleted from database"}

        # Check if GEMINI_API_KEY is configured
        gemini_api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not gemini_api_key:
            # If no API key, just delete from database
            logger.warning("GEMINI_API_KEY not configured, deleting from database only")
            await db.delete(gemini_file)
            await db.commit()
            return {
                "success": True,
                "message": "File deleted from database (Gemini API not configured)",
            }

        # Delete from Gemini File Search Store using REST API
        # According to: https://ai.google.dev/api/all-methods
        # DELETE /v1beta/{name}?key=API_KEY
        api_url = (
            f"https://generativelanguage.googleapis.com/v1beta/{gemini_file.file_name}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                api_url,
                params={"key": gemini_api_key},
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

        return {
            "success": True,
            "message": "File deleted successfully from Gemini and database",
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting Gemini file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete Gemini file: {str(e)}",
        )
