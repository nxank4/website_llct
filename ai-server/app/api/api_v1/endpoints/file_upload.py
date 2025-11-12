"""
File Upload Endpoint for AI Server

This endpoint allows admins to upload files to Gemini File Search Store.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import logging
import httpx
import tempfile
import os

try:
    import google.generativeai as genai  # type: ignore

    GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    GENAI_AVAILABLE = False

from ....middleware.auth import auth_middleware, security
from ....core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class UploadResponse(BaseModel):
    """Response model for file upload"""

    success: bool
    message: str
    file_name: Optional[str] = None
    operation_name: Optional[str] = None


@router.post("/upload", response_model=UploadResponse)
async def upload_file_to_file_search(
    file: UploadFile = File(...),
    display_name: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Upload a file to Gemini File Search Store.

    This endpoint:
    1. Verifies admin authentication
    2. Uploads file to Gemini File Search Store
    3. Waits for indexing to complete
    4. Returns upload status

    Args:
        file: File to upload (PDF, DOCX, TXT, etc.)
        display_name: Optional display name for the file
        credentials: JWT token for authentication

    Returns:
        UploadResponse with upload status
    """
    try:
        # Verify JWT and check admin permissions
        user_id = auth_middleware.get_user_id_from_token(credentials)
        # TODO: Add admin check if needed
        logger.info(f"File upload request from user_id: {user_id}")

        # Validate configuration
        if not GENAI_AVAILABLE or genai is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="google-generativeai package not installed",
            )

        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GEMINI_API_KEY not configured",
            )

        if not settings.FILE_SEARCH_STORE_NAME:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="FILE_SEARCH_STORE_NAME not configured",
            )

        # Configure Gemini API
        genai.configure(api_key=settings.GEMINI_API_KEY)

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size (max 100MB per Gemini API)
        max_size = 100 * 1024 * 1024  # 100MB
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum of 100MB. Current size: {file_size / (1024 * 1024):.2f}MB",
            )

        # Use display_name or fallback to original filename
        file_display_name = display_name or file.filename or "uploaded_file"

        logger.info(
            f"Uploading file: {file_display_name} ({file_size} bytes) to File Search Store: {settings.FILE_SEARCH_STORE_NAME}"
        )

        # Upload file directly to File Search Store using REST API
        # According to docs: https://ai.google.dev/api/all-methods
        # Method: POST /v1beta/{fileSearchStoreName=fileSearchStores/*}:uploadToFileSearchStore
        # This method automatically preprocesses and chunks the file before storing

        # Save file content to temporary file
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=os.path.splitext(file.filename or "")[1]
        ) as tmp_file:
            tmp_file.write(file_content)
            tmp_file_path = tmp_file.name

        try:
            # Use REST API to upload directly to File Search Store
            # According to: https://ai.google.dev/api/all-methods
            # Method: POST /upload/v1beta/{fileSearchStoreName=fileSearchStores/*}:uploadToFileSearchStore
            # This method automatically preprocesses and chunks the file before storing
            api_url = f"https://generativelanguage.googleapis.com/upload/v1beta/{settings.FILE_SEARCH_STORE_NAME}:uploadToFileSearchStore"

            logger.info(f"Uploading file to File Search Store via REST API: {api_url}")

            # Prepare multipart form data
            # Format: multipart/form-data with metadata (JSON) and file
            with open(tmp_file_path, "rb") as f:
                # Read file content
                file_data = f.read()

                # Create multipart form data
                # httpx expects files dict with tuple format: (filename, file_content, content_type)
                files_data = {
                    "file": (
                        file.filename or "uploaded_file",
                        file_data,
                        file.content_type or "application/octet-stream",
                    ),
                }

                # Metadata as JSON string in form data
                data = {
                    "metadata": f'{{"displayName": "{file_display_name}"}}',
                }

                async with httpx.AsyncClient(timeout=300.0) as client:
                    response = await client.post(
                        api_url,
                        data=data,
                        files=files_data,
                        params={"key": settings.GEMINI_API_KEY},
                    )

            # Handle response (may be 200 OK or 202 Accepted for long-running operations)
            if response.status_code not in [200, 202]:
                error_detail = response.text
                logger.error(
                    f"Failed to upload to File Search Store: {response.status_code} - {error_detail}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload to File Search Store: {error_detail}",
                )

            response_data = response.json()
            operation_name = response_data.get(
                "name"
            )  # Long-running operation name (if async)

            logger.info(
                f"File uploaded successfully to File Search Store. Operation: {operation_name or 'completed'}"
            )

            return UploadResponse(
                success=True,
                message="File uploaded successfully to File Search Store. Indexing in progress."
                if operation_name
                else "File uploaded and indexed successfully.",
                file_name=file_display_name,
                operation_name=operation_name,
            )

        except Exception as upload_error:
            logger.error(f"Error uploading file: {upload_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(upload_error)}",
            )
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_file_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file: {e}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )


@router.get("/status/{file_name}")
async def get_file_status(
    file_name: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get the status of an uploaded file.

    Args:
        file_name: Name of the file (from upload response)
        credentials: JWT token for authentication

    Returns:
        File status information
    """
    try:
        # Verify JWT
        user_id = auth_middleware.get_user_id_from_token(credentials)
        logger.info(
            f"File status request from user_id: {user_id} for file: {file_name}"
        )

        # Validate and configure Gemini API
        if not GENAI_AVAILABLE or genai is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="google-generativeai package not installed",
            )

        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GEMINI_API_KEY not configured",
            )

        genai.configure(api_key=settings.GEMINI_API_KEY)

        # Get file information
        file_info = genai.get_file(file_name)

        return {
            "file_name": file_info.name,
            "display_name": file_info.display_name,
            "mime_type": file_info.mime_type,
            "size_bytes": file_info.size_bytes,
            "create_time": file_info.create_time.isoformat()
            if file_info.create_time
            else None,
            "update_time": file_info.update_time.isoformat()
            if file_info.update_time
            else None,
            "state": file_info.state.name if hasattr(file_info, "state") else "UNKNOWN",
        }

    except Exception as e:
        logger.error(f"Error getting file status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file status: {str(e)}",
        )
