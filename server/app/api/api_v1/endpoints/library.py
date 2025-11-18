"""
Library API endpoints for managing documents and subjects
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status as http_status,
    UploadFile,
    File,
    Form,
    Query,
)
from typing import List, Optional
from datetime import datetime
import logging
import aiofiles
from pathlib import Path
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func as sql_func, delete

from ....models.library import (
    LibraryDocument,
    LibrarySubject,
    DocumentType,
    DocumentStatus,
)
from ....models.content import Material, MaterialType
from ....models.notification import NotificationType
from ....models.user import Profile
from ....schemas.library import (
    LibraryDocumentCreate,
    LibraryDocumentUpdate,
    LibraryDocumentResponse,
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    LibraryStatisticsResponse,
)
from ....schemas.notification import NotificationBulkCreate
from ....core.database import get_db_session_write, get_db_session_read
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_supervisor_user,
    get_current_admin_user,
    get_current_user_profile,
)
from ....services.notification_service import create_bulk_notifications

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_admin(user: AuthenticatedUser) -> bool:
    return user.role == "admin"


def _is_supervisor(user: AuthenticatedUser) -> bool:
    return user.role in {"admin", "supervisor", "instructor"}


# File upload configuration
UPLOAD_DIR = Path("uploads/library")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {
    # Documents
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".txt",
    ".rtf",
    # Images
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".svg",
    ".webp",
    # Videos
    ".mp4",
    ".avi",
    ".mov",
    ".wmv",
    ".flv",
    ".webm",
    ".mkv",
    # Audio
    ".mp3",
    ".wav",
    ".aac",
    ".ogg",
    ".m4a",
    ".flac",
    # Archives
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
}


def get_file_type_from_extension(filename: str) -> str:
    """Get document type based on file extension"""
    ext = Path(filename).suffix.lower()

    if ext in [".pdf", ".doc", ".docx", ".txt", ".rtf"]:
        return "document"
    elif ext in [".ppt", ".pptx"]:
        return "presentation"
    elif ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"]:
        return "image"
    elif ext in [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv"]:
        return "video"
    elif ext in [".mp3", ".wav", ".aac", ".ogg", ".m4a", ".flac"]:
        return "audio"
    elif ext in [".zip", ".rar", ".7z", ".tar", ".gz"]:
        return "archive"
    else:
        return "other"


def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate uploaded file"""
    if not file.filename:
        return False, "Tên file không hợp lệ"

    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Loại file không được hỗ trợ: {ext}"

    # Check file size (if available)
    if hasattr(file, "size") and file.size and file.size > MAX_FILE_SIZE:
        return False, f"File quá lớn. Tối đa {MAX_FILE_SIZE // (1024 * 1024)}MB"

    return True, "OK"


async def save_uploaded_file(
    file: UploadFile, subject_code: str
) -> tuple[str, str, int]:
    """Save uploaded file and return (file_path, file_url, file_size)"""
    if not file.filename:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Tên file không hợp lệ",
        )

    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    # Create subject directory
    subject_dir = UPLOAD_DIR / subject_code
    subject_dir.mkdir(exist_ok=True)

    file_path = subject_dir / unique_filename
    file_size = 0

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        file_size = len(content)
        await f.write(content)

    # Generate file URL (relative to uploads directory)
    file_url = f"/uploads/library/{subject_code}/{unique_filename}"

    return str(file_path), file_url, file_size


# ===============================
# Public Library Endpoints (No Authentication Required)
# ===============================


@router.get("/public/documents/", response_model=List[LibraryDocumentResponse])
async def get_public_documents(
    subject_code: Optional[str] = Query(None),
    document_type: Optional[DocumentType] = Query(None),
    author: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get published library documents (public access)"""
    try:
        query = select(LibraryDocument).where(
            LibraryDocument.status == DocumentStatus.PUBLISHED
        )

        if subject_code:
            query = query.where(LibraryDocument.subject_code == subject_code)
        if document_type:
            query = query.where(LibraryDocument.document_type == document_type)
        if author:
            query = query.where(LibraryDocument.author.ilike(f"%{author}%"))

        query = (
            query.order_by(desc(LibraryDocument.created_at)).offset(skip).limit(limit)
        )

        result = await db.execute(query)
        documents = result.scalars().all()

        return [LibraryDocumentResponse.model_validate(doc) for doc in documents]

    except Exception as e:
        logger.error(f"Error getting public documents: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get documents",
        )


@router.get("/public/subjects/", response_model=List[SubjectResponse])
async def get_public_subjects(
    is_active: Optional[bool] = Query(True),
    department: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get active subjects (public access)"""
    try:
        query = select(LibrarySubject)

        if is_active is not None:
            query = query.where(LibrarySubject.is_active == is_active)
        if department:
            query = query.where(LibrarySubject.department.ilike(f"%{department}%"))

        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        subjects = result.scalars().all()

        return [SubjectResponse.model_validate(subject) for subject in subjects]

    except Exception as e:
        logger.error(f"Error getting public subjects: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subjects",
        )


# ===============================
# Library Documents Endpoints (Authenticated)
# ===============================


@router.get("/documents/", response_model=List[LibraryDocumentResponse])
async def get_documents(
    subject_code: Optional[str] = Query(None),
    document_type: Optional[DocumentType] = Query(None),
    doc_status: Optional[DocumentStatus] = Query(None, alias="status"),
    author: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get library documents with filters"""
    try:
        query = select(LibraryDocument)
        conditions = []

        if subject_code:
            conditions.append(LibraryDocument.subject_code == subject_code)
        if document_type:
            conditions.append(LibraryDocument.document_type == document_type)
        if doc_status:
            conditions.append(LibraryDocument.status == doc_status)
        if author:
            conditions.append(LibraryDocument.author.ilike(f"%{author}%"))

        # For non-admin users, only show published documents
        if not _is_admin(current_user):
            conditions.append(LibraryDocument.status == DocumentStatus.PUBLISHED)

        if conditions:
            query = query.where(and_(*conditions))

        query = (
            query.order_by(desc(LibraryDocument.created_at)).offset(skip).limit(limit)
        )

        result = await db.execute(query)
        documents = result.scalars().all()

        return [LibraryDocumentResponse.model_validate(doc) for doc in documents]

    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get documents",
        )


@router.get("/documents/{document_id}", response_model=LibraryDocumentResponse)
async def get_document(
    document_id: int,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Get a specific document"""
    try:
        result = await db.execute(
            select(LibraryDocument).where(LibraryDocument.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        # Check permissions
        doc_status = getattr(document, "status", None)
        doc_owner = getattr(document, "instructor_id", None)
        if (
            doc_status != DocumentStatus.PUBLISHED
            and not _is_admin(current_user)
            and doc_owner != current_user.user_id
        ):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

        # Increment view count
        current_views = document.view_count or 0
        setattr(document, "view_count", current_views + 1)
        await db.commit()
        await db.refresh(document)

        return LibraryDocumentResponse.model_validate(document)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document {document_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document",
        )


@router.post("/documents/", response_model=LibraryDocumentResponse)
async def create_document(
    document_data: LibraryDocumentCreate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    current_profile: Profile = Depends(get_current_user_profile),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Create a new library document"""
    # !!! DEBUG LOG TO VERIFY CODE IS RUNNING !!!
    logger.error(f"DEBUGGING: document_type IS: {document_data.document_type.value}")
    logger.error(f"DEBUGGING: status IS: {document_data.status.value}")
    # !!! -------------------------- !!!

    try:
        # Create document
        # With native_enum=True, we need to ensure SQLAlchemy uses enum value, not member name
        # Explicitly use .value to get the lowercase string value
        document = LibraryDocument(
            title=document_data.title,
            description=document_data.description,
            subject_code=document_data.subject_code,
            subject_name=document_data.subject_name,
            document_type=document_data.document_type.value,  # Pass raw string "textbook"
            author=(
                current_profile.full_name
                or current_user.email
                or str(current_user.user_id)
            ),
            instructor_id=current_user.user_id,
            tags=document_data.tags,
            status=document_data.status.value,  # Pass raw string "published"
            semester=document_data.semester,
            academic_year=document_data.academic_year,
            chapter=document_data.chapter,
            chapter_number=document_data.chapter_number,
            chapter_title=document_data.chapter_title,
            content_html=document_data.content_html,  # Rich text editor content
        )

        db.add(document)
        await db.commit()
        await db.refresh(document)
        logger.info(
            "Document created: %s by %s",
            document.title,
            current_user.email or current_profile.full_name,
        )

        return LibraryDocumentResponse.model_validate(document)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating document: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document",
        )


@router.post("/documents/upload", response_model=LibraryDocumentResponse)
async def upload_document(
    file: Optional[UploadFile] = File(
        None
    ),  # Make file optional to support RTE-only content
    title: str = Form(...),
    description: Optional[str] = Form(None),
    subject_code: str = Form(...),
    subject_name: str = Form(...),
    document_type: DocumentType = Form(...),
    author: str = Form(...),
    tags: str = Form(""),  # Comma-separated tags
    content_html: Optional[str] = Form(None),  # Rich text editor content
    semester: Optional[str] = Form(None),
    academic_year: Optional[str] = Form(None),
    chapter: Optional[str] = Form(None),
    chapter_number: Optional[int] = Form(None),
    chapter_title: Optional[str] = Form(None),
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    current_profile: Profile = Depends(get_current_user_profile),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Upload a file and create library document (Admin/Instructor only)"""
    try:
        # Validate: must have either file or content_html (or both)
        if not file and not content_html:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Either file or content_html (or both) must be provided",
            )

        # Validate file only if provided
        if file:
            is_valid, error_msg = validate_file(file)
            if not is_valid:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST, detail=error_msg
                )

        # Check if subject exists
        result = await db.execute(
            select(LibrarySubject).where(LibrarySubject.code == subject_code)
        )
        subject = result.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Subject {subject_code} not found",
            )

        # Save uploaded file only if provided
        file_path = None
        file_url = None
        file_size = None
        file_type = None
        mime_type = None
        if file:
            file_path, file_url, file_size = await save_uploaded_file(
                file, subject_code
            )
            # Get file type from extension
            file_type = (
                Path(file.filename).suffix.lower()[1:] if file.filename else None
            )  # Remove the dot
            mime_type = file.content_type

        # Parse tags
        tags_list = (
            [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        )

        # Map document_type to MaterialType
        material_type_enum = None
        if document_type:
            # Map DocumentType to MaterialType
            type_mapping = {
                DocumentType.TEXTBOOK: MaterialType.BOOK,
                DocumentType.PRESENTATION: MaterialType.SLIDE,
                DocumentType.VIDEO: MaterialType.VIDEO,
                DocumentType.AUDIO: MaterialType.AUDIO,
                DocumentType.IMAGE: MaterialType.IMAGE,
                DocumentType.DOCUMENT: MaterialType.DOCUMENT,
                DocumentType.OTHER: MaterialType.OTHER,
            }
            material_type_enum = type_mapping.get(document_type, MaterialType.OTHER)

        # Create Material (lecture) instead of LibraryDocument
        # This ensures it appears in the lectures list and detail page
        material = Material(
            title=title,
            description=description or "",
            subject_id=subject.id,
            uploaded_by=current_user.user_id,
            is_published=True,  # Always published when uploaded via this endpoint
            file_url=file_url,
            file_type=file_type,
            material_type=material_type_enum,
            content_html=content_html,  # Rich text editor content
            chapter_number=chapter_number,
            chapter_title=chapter_title,
            file_metadata={
                "file_size": file_size or 0,
                "file_name": file.filename if file else None,
                "file_path": file_path,
                "mime_type": mime_type,
                "uploaded_for": "lecture",
                "storage": "supabase" if file_url else None,
                "author": author,
                "tags": tags_list,
                "semester": semester,
                "academic_year": academic_year,
                "chapter": chapter,
            },
        )

        db.add(material)
        await db.commit()
        await db.refresh(material)

        # Also create LibraryDocument for backward compatibility (if needed)
        # But the main record is now in materials table
        document = LibraryDocument(
            title=title,
            description=description,
            subject_code=subject_code,
            subject_name=subject_name,
            document_type=document_type.value,
            status=DocumentStatus.PUBLISHED.value,
            file_url=file_url,
            file_path=file_path,
            file_name=file.filename if file else None,
            file_size=file_size,
            file_type=file_type,
            mime_type=mime_type,
            author=author,
            instructor_id=current_user.user_id,
            uploader_name=(
                current_profile.full_name
                or current_user.email
                or str(current_user.user_id)
            ),
            tags=tags_list,
            content_html=content_html,
            semester=semester,
            academic_year=academic_year,
            chapter=chapter,
            chapter_number=chapter_number,
            chapter_title=chapter_title,
            published_at=datetime.utcnow(),
        )

        db.add(document)
        await db.commit()
        await db.refresh(document)

        # Update subject document count
        count_result = await db.execute(
            select(sql_func.count(LibraryDocument.id)).where(
                LibraryDocument.subject_code == subject_code
            )
        )
        new_total = count_result.scalar() or 0
        setattr(subject, "total_documents", new_total)
        await db.commit()
        await db.refresh(subject)

        logger.info(
            "Document uploaded (as Material): %s (ID: %s) by %s",
            material.title,
            material.id,
            current_user.email or current_profile.full_name or current_user.user_id,
        )

        # Create notification for all users when document is uploaded
        try:
            notification_data = NotificationBulkCreate(
                title="Tài liệu mới",
                message=f"{material.title} đã được thêm vào thư viện",
                type=NotificationType.INSTRUCTOR,
                link_url=f"/library/lectures/{material.id}",
                user_ids=None,  # Create for all users
            )
            create_bulk_notifications(notification_data=notification_data)
            logger.info("Notification created for document: %s", material.title)
        except Exception as e:
            logger.error(f"Error creating notification for document: {e}")
            # Don't fail the document upload if notification fails

        # Return LibraryDocumentResponse for backward compatibility
        # But the actual record is in materials table with ID = material.id
        return LibraryDocumentResponse.model_validate(document)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document",
        )


@router.patch("/documents/{document_id}", response_model=LibraryDocumentResponse)
async def update_document(
    document_id: int,
    document_data: LibraryDocumentUpdate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Update a library document"""
    try:
        result = await db.execute(
            select(LibraryDocument).where(LibraryDocument.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        # Check permissions
        document_owner = getattr(document, "instructor_id", None)
        if not (_is_admin(current_user) or document_owner == current_user.user_id):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

        # Update fields
        update_data = document_data.dict(exclude_unset=True)

        # !!! DEBUG LOG TO VERIFY ENUM CONVERSION !!!
        if "document_type" in update_data:
            logger.error(
                f"DEBUGGING update_document: document_type BEFORE conversion: {update_data['document_type']} (type: {type(update_data['document_type'])})"
            )
        if "status" in update_data:
            logger.error(
                f"DEBUGGING update_document: status BEFORE conversion: {update_data['status']} (type: {type(update_data['status'])})"
            )
        # !!! -------------------------- !!!

        # Convert Enum members to string values before setattr
        # This ensures SQLAlchemy serializes enum value, not member name
        # Vì Pydantic v2 (dùng trong .dict()) có thể trả về Enum object
        if "document_type" in update_data and isinstance(
            update_data["document_type"], DocumentType
        ):
            update_data["document_type"] = update_data["document_type"].value
        if "status" in update_data and isinstance(
            update_data["status"], DocumentStatus
        ):
            update_data["status"] = update_data["status"].value

        # !!! DEBUG LOG TO VERIFY ENUM CONVERSION !!!
        if "document_type" in update_data:
            logger.error(
                f"DEBUGGING update_document: document_type AFTER conversion: {update_data['document_type']} (type: {type(update_data['document_type'])})"
            )
        if "status" in update_data:
            logger.error(
                f"DEBUGGING update_document: status AFTER conversion: {update_data['status']} (type: {type(update_data['status'])})"
            )
        # !!! -------------------------- !!!

        for field, value in update_data.items():
            setattr(document, field, value)

        # Set published_at when status changes to published
        # Check using string value since we converted enum to value above
        status_value = update_data.get("status")
        if (
            status_value == DocumentStatus.PUBLISHED.value
            or status_value == "published"
        ) and getattr(document, "published_at", None) is None:
            setattr(document, "published_at", datetime.utcnow())

        await db.commit()
        await db.refresh(document)
        logger.info(
            "Document updated: %s by %s",
            document.title,
            current_user.email or current_user.user_id,
        )

        return LibraryDocumentResponse.model_validate(document)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document {document_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document",
        )


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Delete a library document"""
    try:
        result = await db.execute(
            select(LibraryDocument).where(LibraryDocument.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        # Check permissions - admin can delete any document, instructor can only delete their own
        document_owner = getattr(document, "instructor_id", None)
        can_delete = _is_admin(current_user) or (document_owner == current_user.user_id)

        if not can_delete:
            logger.warning(
                "Access denied - User %s cannot delete document %s",
                current_user.email or current_user.user_id,
                document_id,
            )
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

        await db.execute(
            delete(LibraryDocument).where(LibraryDocument.id == document_id)
        )
        await db.commit()
        logger.info(
            "Document deleted: %s by %s",
            document.title,
            current_user.email or current_user.user_id,
        )

        return {"message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document",
        )


@router.post("/documents/{document_id}/download")
async def download_document(
    document_id: int,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Track document download"""
    try:
        result = await db.execute(
            select(LibraryDocument).where(LibraryDocument.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        # Increment download count
        current_downloads = document.download_count or 0
        setattr(document, "download_count", current_downloads + 1)
        await db.commit()
        await db.refresh(document)

        return {"message": "Download tracked", "file_url": document.file_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error tracking download for document %s (user %s): %s",
            document_id,
            current_user.user_id,
            e,
        )
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track download",
        )


# ===============================
# Chapters Endpoints
# ===============================


@router.get("/chapters/", response_model=List[dict])
async def get_chapters(
    subject_code: Optional[str] = Query(
        ..., description="Subject code to get chapters for"
    ),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get unique chapters for a subject"""
    try:
        # Build base query conditions
        conditions = [
            LibraryDocument.subject_code == subject_code,
            LibraryDocument.chapter_number.isnot(None),
            LibraryDocument.chapter_title.isnot(None),
        ]

        # For non-admin users, only show chapters from published documents
        # Admin can see chapters from all documents (including drafts)
        if not _is_admin(current_user):
            conditions.append(LibraryDocument.status == DocumentStatus.PUBLISHED)

        # Query to get distinct chapters using group_by for better distinct handling
        query = (
            select(
                LibraryDocument.chapter_number,
                LibraryDocument.chapter_title,
            )
            .where(and_(*conditions))
            .group_by(LibraryDocument.chapter_number, LibraryDocument.chapter_title)
            .order_by(LibraryDocument.chapter_number)
        )

        result = await db.execute(query)
        chapters_data = result.all()

        chapters = [
            {
                "chapter_number": row.chapter_number,
                "chapter_title": row.chapter_title,
            }
            for row in chapters_data
        ]

        return chapters

    except Exception as e:
        logger.error(f"Error getting chapters: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chapters",
        )


# ===============================
# Subjects Endpoints
# ===============================


@router.get("/subjects/", response_model=List[SubjectResponse])
async def get_subjects(
    is_active: Optional[bool] = Query(None),
    department: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get subjects with filters"""
    try:
        query = select(LibrarySubject)
        conditions = []

        if is_active is not None:
            conditions.append(LibrarySubject.is_active == is_active)
        if department:
            conditions.append(LibrarySubject.department.ilike(f"%{department}%"))

        if conditions:
            query = query.where(and_(*conditions))

        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        subjects = result.scalars().all()

        return [SubjectResponse.model_validate(subject) for subject in subjects]

    except Exception as e:
        logger.error(f"Error getting subjects: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subjects",
        )


@router.post("/subjects/", response_model=SubjectResponse)
async def create_subject(
    subject_data: SubjectCreate,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Create a new subject"""
    try:
        # Check if subject code already exists
        result = await db.execute(
            select(LibrarySubject).where(LibrarySubject.code == subject_data.code)
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Subject code already exists",
            )

        subject = LibrarySubject(
            code=subject_data.code,
            name=subject_data.name,
            description=subject_data.description,
        )

        db.add(subject)
        await db.commit()
        await db.refresh(subject)
        logger.info(
            "Subject created: %s - %s by %s",
            subject.code,
            subject.name,
            current_user.email or current_user.user_id,
        )

        return SubjectResponse.model_validate(subject)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subject: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subject",
        )


@router.patch("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Update a subject"""
    try:
        result = await db.execute(
            select(LibrarySubject).where(LibrarySubject.id == subject_id)
        )
        subject = result.scalar_one_or_none()

        if not subject:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Subject not found"
            )

        # Update fields
        update_data = subject_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(subject, field, value)

        await db.commit()
        await db.refresh(subject)
        logger.info(
            "Subject updated: %s by %s",
            subject.code,
            current_user.email or current_user.user_id,
        )

        return SubjectResponse.model_validate(subject)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subject {subject_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update subject",
        )


@router.delete("/subjects/{subject_id}")
async def delete_subject(
    subject_id: int,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Delete a subject"""
    try:
        result = await db.execute(
            select(LibrarySubject).where(LibrarySubject.id == subject_id)
        )
        subject = result.scalar_one_or_none()

        if not subject:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Subject not found"
            )

        # Check if subject has documents
        count_result = await db.execute(
            select(sql_func.count(LibraryDocument.id)).where(
                LibraryDocument.subject_code == subject.code
            )
        )
        document_count = count_result.scalar() or 0

        if document_count > 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete subject with {document_count} documents. Please remove or reassign documents first.",
            )

        await db.execute(delete(LibrarySubject).where(LibrarySubject.id == subject_id))
        await db.commit()
        logger.info(
            "Subject deleted: %s by %s",
            subject.code,
            current_user.email or current_user.user_id,
        )

        return {"message": "Subject deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting subject {subject_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete subject",
        )


@router.post("/subjects/recalculate-documents")
async def recalculate_document_counts(
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Recalculate document counts for all subjects"""
    try:
        result = await db.execute(select(LibrarySubject))
        subjects = result.scalars().all()
        updated_count = 0

        for subject in subjects:
            # Count actual documents for this subject
            count_result = await db.execute(
                select(sql_func.count(LibraryDocument.id)).where(
                    LibraryDocument.subject_code == subject.code
                )
            )
            actual_count = count_result.scalar() or 0

            # Update if different
            current_total = getattr(subject, "total_documents", 0) or 0
            if current_total != actual_count:
                setattr(subject, "total_documents", actual_count)
                await db.commit()
                await db.refresh(subject)
                updated_count += 1
                logger.info(
                    f"Updated {subject.code}: {subject.total_documents} -> {actual_count} documents"
                )

        logger.info(
            "Recalculated document counts for %s subjects by %s",
            updated_count,
            current_user.email or current_user.user_id,
        )

        return {
            "message": f"Successfully recalculated document counts for {updated_count} subjects",
            "updated_subjects": updated_count,
            "total_subjects": len(subjects),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recalculating document counts: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to recalculate document counts",
        )


@router.post("/documents/{document_id}/view")
async def increment_document_view(
    document_id: int,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Increment view count for a document"""
    try:
        result = await db.execute(
            select(LibraryDocument).where(LibraryDocument.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        # Increment view count
        current_view_count: int = int(getattr(document, "view_count", 0) or 0)
        setattr(document, "view_count", current_view_count + 1)
        await db.commit()
        await db.refresh(document)

        logger.info(
            "View count incremented for document %s by %s",
            document_id,
            current_user.email or current_user.user_id,
        )

        return {
            "message": "View count incremented",
            "view_count": document.view_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing view count for document {document_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to increment view count",
        )


@router.post("/documents/{document_id}/rate")
async def rate_document(
    document_id: int,
    rating: int = Form(..., ge=1, le=5, description="Rating from 1 to 5"),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Rate a document (1-5 stars)"""
    try:
        result = await db.execute(
            select(LibraryDocument).where(LibraryDocument.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        # Update rating_sum and rating_count
        current_rating_sum: int = int(getattr(document, "rating_sum", 0) or 0)
        current_rating_count: int = int(getattr(document, "rating_count", 0) or 0)
        setattr(document, "rating_sum", current_rating_sum + rating)
        setattr(document, "rating_count", current_rating_count + 1)

        # Calculate new average rating
        new_rating_count = current_rating_count + 1
        if new_rating_count > 0:
            new_rating = round(
                float(current_rating_sum + rating) / float(new_rating_count), 2
            )
            setattr(document, "rating", new_rating)

        await db.commit()
        await db.refresh(document)

        logger.info(
            "Document %s rated %d stars by %s (new average: %.2f)",
            document_id,
            rating,
            current_user.email or current_user.user_id,
            document.rating,
        )

        return {
            "message": "Rating submitted successfully",
            "rating": document.rating,
            "rating_count": document.rating_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rating document {document_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit rating",
        )


@router.get("/statistics", response_model=LibraryStatisticsResponse)
async def get_library_statistics(
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get library statistics for dashboard"""
    try:
        # Total documents
        total_docs_result = await db.execute(select(sql_func.count(LibraryDocument.id)))
        total_documents = total_docs_result.scalar() or 0

        # Total view count
        total_views_result = await db.execute(
            select(sql_func.sum(LibraryDocument.view_count))
        )
        total_view_count = int(total_views_result.scalar() or 0)

        # Average rating and total ratings
        avg_rating_result = await db.execute(
            select(
                sql_func.avg(LibraryDocument.rating),
                sql_func.sum(LibraryDocument.rating_count),
            )
        )
        avg_rating_row = avg_rating_result.first()
        average_rating = float(avg_rating_row[0] or 0.0) if avg_rating_row else 0.0
        total_ratings = int(avg_rating_row[1] or 0) if avg_rating_row else 0

        # Documents by subject
        docs_by_subject_result = await db.execute(
            select(
                LibraryDocument.subject_code,
                LibraryDocument.subject_name,
                sql_func.count(LibraryDocument.id).label("count"),
                sql_func.sum(LibraryDocument.view_count).label("total_views"),
                sql_func.avg(LibraryDocument.rating).label("avg_rating"),
            )
            .group_by(LibraryDocument.subject_code, LibraryDocument.subject_name)
            .order_by(desc("count"))
        )
        documents_by_subject = []
        for row in docs_by_subject_result:
            if row.subject_code:
                documents_by_subject.append(
                    {
                        "subject_code": row.subject_code,
                        "subject_name": row.subject_name or row.subject_code,
                        "count": row.count or 0,
                        "total_views": int(row.total_views or 0),
                        "avg_rating": float(row.avg_rating or 0.0),
                    }
                )

        # Documents by status
        docs_by_status_result = await db.execute(
            select(
                LibraryDocument.status,
                sql_func.count(LibraryDocument.id).label("count"),
            ).group_by(LibraryDocument.status)
        )
        documents_by_status = {}
        for row in docs_by_status_result:
            if row.status:
                status_value = (
                    row.status.value
                    if hasattr(row.status, "value")
                    else str(row.status)
                )
                documents_by_status[status_value] = row.count or 0

        # Documents by type
        docs_by_type_result = await db.execute(
            select(
                LibraryDocument.document_type,
                sql_func.count(LibraryDocument.id).label("count"),
            ).group_by(LibraryDocument.document_type)
        )
        documents_by_type = {}
        for row in docs_by_type_result:
            if row.document_type:
                type_value = (
                    row.document_type.value
                    if hasattr(row.document_type, "value")
                    else str(row.document_type)
                )
                documents_by_type[type_value] = row.count or 0

        return LibraryStatisticsResponse(
            total_documents=total_documents,
            total_view_count=total_view_count,
            average_rating=round(average_rating, 2),
            total_ratings=total_ratings,
            documents_by_subject=documents_by_subject,
            documents_by_status=documents_by_status,
            documents_by_type=documents_by_type,
        )

    except Exception as e:
        logger.error(f"Error getting library statistics: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get library statistics",
        )
