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
from ....models.notification import NotificationType
from ....models.user import Profile
from ....schemas.library import (
    LibraryDocumentCreate,
    LibraryDocumentUpdate,
    LibraryDocumentResponse,
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
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
    try:
        # Create document
        document = LibraryDocument(
            title=document_data.title,
            description=document_data.description,
            subject_code=document_data.subject_code,
            subject_name=document_data.subject_name,
            document_type=document_data.document_type,
            author=(
                current_profile.full_name
                or current_user.email
                or str(current_user.user_id)
            ),
            instructor_id=current_user.user_id,
            tags=document_data.tags,
            status=document_data.status,
            semester=document_data.semester,
            academic_year=document_data.academic_year,
            chapter=document_data.chapter,
            chapter_number=document_data.chapter_number,
            chapter_title=document_data.chapter_title,
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
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    subject_code: str = Form(...),
    subject_name: str = Form(...),
    document_type: DocumentType = Form(...),
    author: str = Form(...),
    tags: str = Form(""),  # Comma-separated tags
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
        # Validate file
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

        # Save uploaded file
        file_path, file_url, file_size = await save_uploaded_file(file, subject_code)

        # Parse tags
        tags_list = (
            [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        )

        # Get file type from extension
        file_type = (
            Path(file.filename).suffix.lower()[1:] if file.filename else None
        )  # Remove the dot

        # Create document
        document = LibraryDocument(
            title=title,
            description=description,
            subject_code=subject_code,
            subject_name=subject_name,
            document_type=document_type,
            status=DocumentStatus.PUBLISHED,
            file_url=file_url,
            file_path=file_path,
            file_name=file.filename,
            file_size=file_size,
            file_type=file_type,
            mime_type=file.content_type,
            author=author,
            instructor_id=current_user.user_id,
            uploader_name=(
                current_profile.full_name
                or current_user.email
                or str(current_user.user_id)
            ),
            tags=tags_list,
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
            "Document uploaded: %s (%s) by %s",
            document.title,
            file.filename,
            current_user.email or current_profile.full_name or current_user.user_id,
        )

        # Create notification for all users when document is uploaded
        try:
            notification_data = NotificationBulkCreate(
                title="Tài liệu mới",
                message=f"{document.title} đã được thêm vào thư viện",
                type=NotificationType.DOCUMENT,
                link_url=f"/library?subject={subject_code}",
                user_ids=None,  # Create for all users
            )
            create_bulk_notifications(notification_data=notification_data)
            logger.info("Notification created for document: %s", document.title)
        except Exception as e:
            logger.error(f"Error creating notification for document: {e}")
            # Don't fail the document upload if notification fails

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
        for field, value in update_data.items():
            setattr(document, field, value)

        # Set published_at when status changes to published
        if (
            update_data.get("status") == DocumentStatus.PUBLISHED
            and getattr(document, "published_at", None) is None
        ):
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
