"""
Library API endpoints for managing documents and subjects
"""
from fastapi import APIRouter, Depends, HTTPException, status as http_status, UploadFile, File, Form, Query
from typing import List, Optional
from datetime import datetime
import logging
import os
import aiofiles
from pathlib import Path
import uuid
import mimetypes
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, desc, func as sql_func

from ....models.library import LibraryDocument, LibrarySubject, DocumentType, DocumentStatus
from ....models.user import User
from ....models.notification import NotificationType
from ....schemas.library import (
    LibraryDocumentCreate, LibraryDocumentUpdate, LibraryDocumentResponse,
    SubjectCreate, SubjectUpdate, SubjectResponse
)
from ....schemas.notification import NotificationBulkCreate
from ....core.database import get_db
from ....middleware.auth import get_current_user
from ....services.notification_service import create_bulk_notifications

logger = logging.getLogger(__name__)
router = APIRouter()

# File upload configuration
UPLOAD_DIR = Path("uploads/library")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {
    # Documents
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.rtf',
    # Images
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
    # Videos
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
    # Audio
    '.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac',
    # Archives
    '.zip', '.rar', '.7z', '.tar', '.gz'
}

def get_file_type_from_extension(filename: str) -> str:
    """Get document type based on file extension"""
    ext = Path(filename).suffix.lower()
    
    if ext in ['.pdf', '.doc', '.docx', '.txt', '.rtf']:
        return 'document'
    elif ext in ['.ppt', '.pptx']:
        return 'presentation'  
    elif ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']:
        return 'image'
    elif ext in ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']:
        return 'video'
    elif ext in ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac']:
        return 'audio'
    elif ext in ['.zip', '.rar', '.7z', '.tar', '.gz']:
        return 'archive'
    else:
        return 'other'

def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate uploaded file"""
    if not file.filename:
        return False, "Tên file không hợp lệ"
    
    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Loại file không được hỗ trợ: {ext}"
    
    # Check file size (if available)
    if hasattr(file, 'size') and file.size and file.size > MAX_FILE_SIZE:
        return False, f"File quá lớn. Tối đa {MAX_FILE_SIZE // (1024*1024)}MB"
    
    return True, "OK"

async def save_uploaded_file(file: UploadFile, subject_code: str) -> tuple[str, str, int]:
    """Save uploaded file and return (file_path, file_url, file_size)"""
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    # Create subject directory
    subject_dir = UPLOAD_DIR / subject_code
    subject_dir.mkdir(exist_ok=True)
    
    file_path = subject_dir / unique_filename
    file_size = 0
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
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
    db: Session = Depends(get_db)
):
    """Get published library documents (public access)"""
    try:
        query = select(LibraryDocument).where(LibraryDocument.status == DocumentStatus.PUBLISHED)
        
        if subject_code:
            query = query.where(LibraryDocument.subject_code == subject_code)
        if document_type:
            query = query.where(LibraryDocument.document_type == document_type)
        if author:
            query = query.where(LibraryDocument.author.ilike(f"%{author}%"))
        
        query = query.order_by(desc(LibraryDocument.created_at)).offset(skip).limit(limit)
        
        result = db.execute(query)
        documents = result.scalars().all()
        
        return [LibraryDocumentResponse.model_validate(doc) for doc in documents]
        
    except Exception as e:
        logger.error(f"Error getting public documents: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get documents"
        )

@router.get("/public/subjects/", response_model=List[SubjectResponse])
async def get_public_subjects(
    is_active: Optional[bool] = Query(True),
    department: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get active subjects (public access)"""
    try:
        query = select(LibrarySubject)
        
        if is_active is not None:
            query = query.where(LibrarySubject.is_active == is_active)
        if department:
            query = query.where(LibrarySubject.department.ilike(f"%{department}%"))
        
        query = query.offset(skip).limit(limit)
        
        result = db.execute(query)
        subjects = result.scalars().all()
        
        return [SubjectResponse.model_validate(subject) for subject in subjects]
        
    except Exception as e:
        logger.error(f"Error getting public subjects: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subjects"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
        if not current_user.is_superuser:
            conditions.append(LibraryDocument.status == DocumentStatus.PUBLISHED)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(desc(LibraryDocument.created_at)).offset(skip).limit(limit)
        
        result = db.execute(query)
        documents = result.scalars().all()
        
        return [LibraryDocumentResponse.model_validate(doc) for doc in documents]
        
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get documents"
        )

@router.get("/documents/{document_id}", response_model=LibraryDocumentResponse)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific document"""
    try:
        result = db.execute(select(LibraryDocument).where(LibraryDocument.id == document_id))
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check permissions
        if (document.status != DocumentStatus.PUBLISHED and 
            not current_user.is_superuser and 
            document.instructor_id != current_user.id):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Increment view count
        document.view_count += 1
        db.commit()
        db.refresh(document)
        
        return LibraryDocumentResponse.model_validate(document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document {document_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document"
        )

@router.post("/documents/", response_model=LibraryDocumentResponse)
async def create_document(
    document_data: LibraryDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new library document"""
    try:
        # Check permissions (admin or instructor)
        if not current_user.is_superuser and not current_user.is_instructor:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Only admin and instructors can create documents"
            )
        
        # Create document
        document = LibraryDocument(
            title=document_data.title,
            description=document_data.description,
            subject_code=document_data.subject_code,
            subject_name=document_data.subject_name,
            document_type=document_data.document_type,
            author=document_data.author if hasattr(document_data, 'author') else None,
            instructor_id=current_user.id,
            tags=document_data.tags,
            status=document_data.status
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        logger.info(f"Document created: {document.title} by {current_user.email}")
        
        return LibraryDocumentResponse.model_validate(document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating document: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document"
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
    keywords: str = Form(""),  # Comma-separated keywords
    semester: Optional[str] = Form(None),
    academic_year: Optional[str] = Form(None),
    chapter: Optional[str] = Form(None),
    lesson: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a file and create library document (Admin/Instructor only)"""
    try:
        # Check permissions
        if not current_user.is_superuser and not current_user.is_instructor:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Only admin and instructors can upload documents"
            )
        
        # Validate file
        is_valid, error_msg = validate_file(file)
        if not is_valid:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Check if subject exists
        result = db.execute(select(LibrarySubject).where(LibrarySubject.code == subject_code))
        subject = result.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Subject {subject_code} not found"
            )
        
        # Save uploaded file
        file_path, file_url, file_size = await save_uploaded_file(file, subject_code)
        
        # Parse tags and keywords
        tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        keywords_list = [kw.strip() for kw in keywords.split(",") if kw.strip()] if keywords else []
        
        # Get file type from extension
        file_type = Path(file.filename).suffix.lower()[1:] if file.filename else None  # Remove the dot
        
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
            instructor_id=current_user.id,
            uploader_name=current_user.full_name,
            tags=tags_list,
            keywords=keywords_list,
            semester=semester,
            academic_year=academic_year,
            chapter=chapter,
            lesson=lesson,
            published_at=datetime.utcnow()
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Update subject document count
        count_result = db.execute(
            select(sql_func.count(LibraryDocument.id)).where(
                LibraryDocument.subject_code == subject_code
            )
        )
        subject.total_documents = count_result.scalar() or 0
        db.commit()
        db.refresh(subject)
        
        logger.info(f"Document uploaded: {document.title} ({file.filename}) by {current_user.email}")
        
        # Create notification for all users when document is uploaded
        try:
            notification_data = NotificationBulkCreate(
                title="Tài liệu mới",
                message=f"{document.title} đã được thêm vào thư viện",
                type=NotificationType.DOCUMENT,
                link_url=f"/library?subject={subject_code}",
                user_ids=None  # Create for all users
            )
            create_bulk_notifications(db=db, notification_data=notification_data)
            logger.info(f"Notification created for document: {document.title}")
        except Exception as e:
            logger.error(f"Error creating notification for document: {e}")
            # Don't fail the document upload if notification fails
        
        return LibraryDocumentResponse.model_validate(document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )

@router.patch("/documents/{document_id}", response_model=LibraryDocumentResponse)
async def update_document(
    document_id: int,
    document_data: LibraryDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a library document"""
    try:
        result = db.execute(select(LibraryDocument).where(LibraryDocument.id == document_id))
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check permissions
        if (not current_user.is_superuser and 
            document.instructor_id != current_user.id):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Update fields
        update_data = document_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(document, field, value)
        
        # Set published_at when status changes to published
        if document_data.status == DocumentStatus.PUBLISHED and not document.published_at:
            document.published_at = datetime.utcnow()
        
        db.commit()
        db.refresh(document)
        logger.info(f"Document updated: {document.title} by {current_user.email}")
        
        return LibraryDocumentResponse.model_validate(document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document {document_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document"
        )

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a library document"""
    try:
        result = db.execute(select(LibraryDocument).where(LibraryDocument.id == document_id))
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check permissions - admin can delete any document, instructor can only delete their own
        can_delete = (
            current_user.is_superuser or  # Admin can delete anything
            (current_user.is_instructor and document.instructor_id == current_user.id)  # Instructor can delete own
        )
        
        if not can_delete:
            logger.warning(f"Access denied - User {current_user.email} cannot delete document {document_id}")
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        db.delete(document)
        db.commit()
        logger.info(f"Document deleted: {document.title} by {current_user.email}")
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )

@router.post("/documents/{document_id}/download")
async def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Track document download"""
    try:
        result = db.execute(select(LibraryDocument).where(LibraryDocument.id == document_id))
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Increment download count
        document.download_count += 1
        db.commit()
        db.refresh(document)
        
        return {"message": "Download tracked", "file_url": document.file_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking download for document {document_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track download"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
        
        result = db.execute(query)
        subjects = result.scalars().all()
        
        return [SubjectResponse.model_validate(subject) for subject in subjects]
        
    except Exception as e:
        logger.error(f"Error getting subjects: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subjects"
        )

@router.post("/subjects/", response_model=SubjectResponse)
async def create_subject(
    subject_data: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new subject"""
    try:
        # Check permissions (admin only)
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Only admin can create subjects"
            )
        
        # Check if subject code already exists
        result = db.execute(select(LibrarySubject).where(LibrarySubject.code == subject_data.code))
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Subject code already exists"
            )
        
        subject = LibrarySubject(
            code=subject_data.code,
            name=subject_data.name,
            description=subject_data.description
        )
        
        db.add(subject)
        db.commit()
        db.refresh(subject)
        logger.info(f"Subject created: {subject.code} - {subject.name} by {current_user.email}")
        
        return SubjectResponse.model_validate(subject)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subject: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subject"
        )

@router.patch("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a subject"""
    try:
        # Check permissions (admin only)
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Only admin can update subjects"
            )
        
        result = db.execute(select(LibrarySubject).where(LibrarySubject.id == subject_id))
        subject = result.scalar_one_or_none()
        
        if not subject:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )
        
        # Update fields
        update_data = subject_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(subject, field, value)
        
        db.commit()
        db.refresh(subject)
        logger.info(f"Subject updated: {subject.code} by {current_user.email}")
        
        return SubjectResponse.model_validate(subject)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subject {subject_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update subject"
        )

@router.post("/subjects/recalculate-documents")
async def recalculate_document_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recalculate document counts for all subjects"""
    try:
        # Check permissions (admin only)
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Only admin can recalculate document counts"
            )
        
        result = db.execute(select(LibrarySubject))
        subjects = result.scalars().all()
        updated_count = 0
        
        for subject in subjects:
            # Count actual documents for this subject
            count_result = db.execute(
                select(sql_func.count(LibraryDocument.id)).where(
                    LibraryDocument.subject_code == subject.code
                )
            )
            actual_count = count_result.scalar() or 0
            
            # Update if different
            if subject.total_documents != actual_count:
                subject.total_documents = actual_count
                db.commit()
                db.refresh(subject)
                updated_count += 1
                logger.info(f"Updated {subject.code}: {subject.total_documents} -> {actual_count} documents")
        
        logger.info(f"Recalculated document counts for {updated_count} subjects by {current_user.email}")
        
        return {
            "message": f"Successfully recalculated document counts for {updated_count} subjects",
            "updated_subjects": updated_count,
            "total_subjects": len(subjects)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recalculating document counts: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to recalculate document counts"
        )
