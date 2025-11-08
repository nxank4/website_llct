"""
Library API endpoints for managing documents and subjects
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import logging
import os
import aiofiles
from pathlib import Path
import uuid
import mimetypes
from beanie import PydanticObjectId

from app.models.mongodb_models import (
    LibraryDocument, Subject, User,
    LibraryDocumentCreate, LibraryDocumentUpdate, LibraryDocumentResponse,
    SubjectCreate, SubjectUpdate, SubjectResponse,
    DocumentType, DocumentStatus
)
from app.api.api_v1.endpoints.mongodb_auth import get_current_user

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
    subject_code: Optional[str] = None,
    document_type: Optional[DocumentType] = None,
    author: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get published library documents (public access)"""
    try:
        # Build query - only show published documents
        query = {"status": DocumentStatus.PUBLISHED}
        
        if subject_code:
            query["subject_code"] = subject_code
        if document_type:
            query["document_type"] = document_type
        if author:
            query["author"] = {"$regex": author, "$options": "i"}
        
        documents = await LibraryDocument.find(query).skip(skip).limit(limit).to_list()
        
        return [
            LibraryDocumentResponse(
                id=str(doc.id),
                title=doc.title,
                description=doc.description,
                subject_code=doc.subject_code,
                subject_name=doc.subject_name,
                document_type=doc.document_type,
                status=doc.status,
                file_url=doc.file_url,
                file_name=doc.file_name,
                file_size=doc.file_size,
                file_type=doc.file_type,
                author=doc.author,
                instructor_id=str(doc.instructor_id) if doc.instructor_id else None,
                tags=doc.tags,
                keywords=doc.keywords,
                semester=doc.semester,
                academic_year=doc.academic_year,
                chapter=doc.chapter,
                lesson=doc.lesson,
                download_count=doc.download_count,
                view_count=doc.view_count,
                rating=doc.rating,
                rating_count=doc.rating_count,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                published_at=doc.published_at
            )
            for doc in documents
        ]
        
    except Exception as e:
        logger.error(f"Error getting public documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get documents"
        )

@router.get("/public/subjects/", response_model=List[SubjectResponse])
async def get_public_subjects(
    is_active: Optional[bool] = True,
    department: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get active subjects (public access)"""
    try:
        query = {}
        if is_active is not None:
            query["is_active"] = is_active
        if department:
            query["department"] = {"$regex": department, "$options": "i"}
        
        subjects = await Subject.find(query).skip(skip).limit(limit).to_list()
        
        return [
            SubjectResponse(
                id=str(subject.id),
                code=subject.code,
                name=subject.name,
                description=subject.description,
                credits=subject.credits,
                department=subject.department,
                faculty=subject.faculty,
                prerequisite_subjects=subject.prerequisite_subjects,
                primary_instructor_id=str(subject.primary_instructor_id) if subject.primary_instructor_id else None,
                instructors=[str(instructor_id) for instructor_id in subject.instructors],
                total_documents=subject.total_documents,
                total_students=subject.total_students,
                is_active=subject.is_active,
                created_at=subject.created_at,
                updated_at=subject.updated_at
            )
            for subject in subjects
        ]
        
    except Exception as e:
        logger.error(f"Error getting public subjects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subjects"
        )

# ===============================
# Library Documents Endpoints (Authenticated)
# ===============================

@router.get("/documents/", response_model=List[LibraryDocumentResponse])
async def get_documents(
    subject_code: Optional[str] = None,
    document_type: Optional[DocumentType] = None,
    status: Optional[DocumentStatus] = None,
    author: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Get library documents with filters"""
    try:
        # Build query
        query = {}
        if subject_code:
            query["subject_code"] = subject_code
        if document_type:
            query["document_type"] = document_type
        if status:
            query["status"] = status
        if author:
            query["author"] = {"$regex": author, "$options": "i"}
        
        # For non-admin users, only show published documents
        if current_user.role != "admin":
            query["status"] = DocumentStatus.PUBLISHED
        
        documents = await LibraryDocument.find(query).skip(skip).limit(limit).to_list()
        
        return [
            LibraryDocumentResponse(
                id=str(doc.id),
                title=doc.title,
                description=doc.description,
                subject_code=doc.subject_code,
                subject_name=doc.subject_name,
                document_type=doc.document_type,
                status=doc.status,
                file_url=doc.file_url,
                file_name=doc.file_name,
                file_size=doc.file_size,
                file_type=doc.file_type,
                author=doc.author,
                instructor_id=str(doc.instructor_id) if doc.instructor_id else None,
                tags=doc.tags,
                keywords=doc.keywords,
                semester=doc.semester,
                academic_year=doc.academic_year,
                chapter=doc.chapter,
                lesson=doc.lesson,
                download_count=doc.download_count,
                view_count=doc.view_count,
                rating=doc.rating,
                rating_count=doc.rating_count,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                published_at=doc.published_at
            )
            for doc in documents
        ]
        
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get documents"
        )

@router.get("/documents/{document_id}", response_model=LibraryDocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific document"""
    try:
        document = await LibraryDocument.get(PydanticObjectId(document_id))
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check permissions
        if (document.status != DocumentStatus.PUBLISHED and 
            current_user.role != "admin" and 
            document.instructor_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Increment view count
        document.view_count += 1
        await document.save()
        
        return LibraryDocumentResponse(
            id=str(document.id),
            title=document.title,
            description=document.description,
            subject_code=document.subject_code,
            subject_name=document.subject_name,
            document_type=document.document_type,
            status=document.status,
            file_url=document.file_url,
            file_name=document.file_name,
            file_size=document.file_size,
            file_type=document.file_type,
            author=document.author,
            instructor_id=str(document.instructor_id) if document.instructor_id else None,
            tags=document.tags,
            keywords=document.keywords,
            semester=document.semester,
            academic_year=document.academic_year,
            chapter=document.chapter,
            lesson=document.lesson,
            download_count=document.download_count,
            view_count=document.view_count,
            rating=document.rating,
            rating_count=document.rating_count,
            created_at=document.created_at,
            updated_at=document.updated_at,
            published_at=document.published_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document"
        )

@router.post("/documents/", response_model=LibraryDocumentResponse)
async def create_document(
    document_data: LibraryDocumentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new library document"""
    try:
        # Check permissions (admin or instructor)
        if current_user.role not in ["admin", "instructor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin and instructors can create documents"
            )
        
        # Create document
        document = LibraryDocument(
            title=document_data.title,
            description=document_data.description,
            subject_code=document_data.subject_code,
            subject_name=document_data.subject_name,
            document_type=document_data.document_type,
            author=document_data.author,
            instructor_id=current_user.id,
            tags=document_data.tags,
            keywords=document_data.keywords,
            semester=document_data.semester,
            academic_year=document_data.academic_year,
            chapter=document_data.chapter,
            lesson=document_data.lesson
        )
        
        await document.save()
        logger.info(f"Document created: {document.title} by {current_user.email}")
        
        return LibraryDocumentResponse(
            id=str(document.id),
            title=document.title,
            description=document.description,
            subject_code=document.subject_code,
            subject_name=document.subject_name,
            document_type=document.document_type,
            status=document.status,
            file_url=document.file_url,
            file_name=document.file_name,
            file_size=document.file_size,
            file_type=document.file_type,
            author=document.author,
            instructor_id=str(document.instructor_id) if document.instructor_id else None,
            tags=document.tags,
            keywords=document.keywords,
            semester=document.semester,
            academic_year=document.academic_year,
            chapter=document.chapter,
            lesson=document.lesson,
            download_count=document.download_count,
            view_count=document.view_count,
            rating=document.rating,
            rating_count=document.rating_count,
            created_at=document.created_at,
            updated_at=document.updated_at,
            published_at=document.published_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
    current_user: User = Depends(get_current_user)
):
    """Upload a file and create library document (Admin/Instructor only)"""
    try:
        # Check permissions
        if current_user.role not in ["admin", "instructor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin and instructors can upload documents"
            )
        
        # Validate file
        is_valid, error_msg = validate_file(file)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Check if subject exists
        subject = await Subject.find_one({"code": subject_code})
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject {subject_code} not found"
            )
        
        # Save uploaded file
        file_path, file_url, file_size = await save_uploaded_file(file, subject_code)
        
        # Parse tags and keywords
        tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        keywords_list = [kw.strip() for kw in keywords.split(",") if kw.strip()] if keywords else []
        
        # Get file type from extension
        file_type = Path(file.filename).suffix.lower()[1:]  # Remove the dot
        
        # Create document
        document = LibraryDocument(
            title=title,
            description=description,
            subject_code=subject_code,
            subject_name=subject_name,
            document_type=document_type,
            status=DocumentStatus.PUBLISHED,
            file_url=file_url,
            file_name=file.filename,
            file_size=file_size,
            file_type=file_type,
            author=author,
            instructor_id=current_user.id,
            tags=tags_list,
            keywords=keywords_list,
            semester=semester,
            academic_year=academic_year,
            chapter=chapter,
            lesson=lesson
        )
        
        await document.save()
        
        # Update subject document count
        subject.total_documents = await LibraryDocument.find({"subject_code": subject_code}).count()
        await subject.save()
        
        logger.info(f"Document uploaded: {document.title} ({file.filename}) by {current_user.email}")
        
        return LibraryDocumentResponse(
            id=str(document.id),
            title=document.title,
            description=document.description,
            subject_code=document.subject_code,
            subject_name=document.subject_name,
            document_type=document.document_type,
            status=document.status,
            file_url=document.file_url,
            file_name=document.file_name,
            file_size=document.file_size,
            file_type=document.file_type,
            author=document.author,
            instructor_id=str(document.instructor_id) if document.instructor_id else None,
            tags=document.tags,
            keywords=document.keywords,
            semester=document.semester,
            academic_year=document.academic_year,
            chapter=document.chapter,
            lesson=document.lesson,
            download_count=document.download_count,
            view_count=document.view_count,
            rating=document.rating,
            rating_count=document.rating_count,
            created_at=document.created_at,
            updated_at=document.updated_at,
            published_at=document.published_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )

@router.patch("/documents/{document_id}", response_model=LibraryDocumentResponse)
async def update_document(
    document_id: str,
    document_data: LibraryDocumentUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a library document"""
    try:
        document = await LibraryDocument.get(PydanticObjectId(document_id))
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check permissions
        if (current_user.role != "admin" and 
            document.instructor_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Update fields
        update_data = document_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(document, field, value)
        
        document.updated_at = datetime.utcnow()
        
        # Set published_at when status changes to published
        if document_data.status == DocumentStatus.PUBLISHED and not document.published_at:
            document.published_at = datetime.utcnow()
        
        await document.save()
        logger.info(f"Document updated: {document.title} by {current_user.email}")
        
        return LibraryDocumentResponse(
            id=str(document.id),
            title=document.title,
            description=document.description,
            subject_code=document.subject_code,
            subject_name=document.subject_name,
            document_type=document.document_type,
            status=document.status,
            file_url=document.file_url,
            file_name=document.file_name,
            file_size=document.file_size,
            file_type=document.file_type,
            author=document.author,
            instructor_id=str(document.instructor_id) if document.instructor_id else None,
            tags=document.tags,
            keywords=document.keywords,
            semester=document.semester,
            academic_year=document.academic_year,
            chapter=document.chapter,
            lesson=document.lesson,
            download_count=document.download_count,
            view_count=document.view_count,
            rating=document.rating,
            rating_count=document.rating_count,
            created_at=document.created_at,
            updated_at=document.updated_at,
            published_at=document.published_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document"
        )

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a library document"""
    try:
        document = await LibraryDocument.get(PydanticObjectId(document_id))
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check permissions - admin can delete any document, instructor can only delete their own
        logger.info(f"Delete permission check - User: {current_user.email}, Role: {current_user.role}, User ID: {current_user.id}")
        logger.info(f"Document: {document.title}, Instructor ID: {document.instructor_id}")
        
        # Admin can delete any document, instructor can only delete their own
        can_delete = (
            current_user.role == "admin" or  # Admin can delete anything
            (current_user.role == "instructor" and document.instructor_id == current_user.id)  # Instructor can delete own
        )
        
        if not can_delete:
            logger.warning(f"Access denied - User {current_user.email} (role: {current_user.role}) cannot delete document {document.id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Role: {current_user.role}, Can delete: {'Yes' if current_user.role == 'admin' else 'Only own documents'}"
            )
        
        await document.delete()
        logger.info(f"Document deleted: {document.title} by {current_user.email}")
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )

@router.post("/documents/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Track document download"""
    try:
        document = await LibraryDocument.get(PydanticObjectId(document_id))
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Increment download count
        document.download_count += 1
        await document.save()
        
        return {"message": "Download tracked", "file_url": document.file_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking download for document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track download"
        )

# ===============================
# Subjects Endpoints
# ===============================

@router.get("/subjects/", response_model=List[SubjectResponse])
async def get_subjects(
    is_active: Optional[bool] = None,
    department: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Get subjects with filters"""
    try:
        query = {}
        if is_active is not None:
            query["is_active"] = is_active
        if department:
            query["department"] = {"$regex": department, "$options": "i"}
        
        subjects = await Subject.find(query).skip(skip).limit(limit).to_list()
        
        return [
            SubjectResponse(
                id=str(subject.id),
                code=subject.code,
                name=subject.name,
                description=subject.description,
                credits=subject.credits,
                department=subject.department,
                faculty=subject.faculty,
                prerequisite_subjects=subject.prerequisite_subjects,
                primary_instructor_id=str(subject.primary_instructor_id) if subject.primary_instructor_id else None,
                instructors=[str(instructor_id) for instructor_id in subject.instructors],
                total_documents=subject.total_documents,
                total_students=subject.total_students,
                is_active=subject.is_active,
                created_at=subject.created_at,
                updated_at=subject.updated_at
            )
            for subject in subjects
        ]
        
    except Exception as e:
        logger.error(f"Error getting subjects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subjects"
        )

@router.post("/subjects/", response_model=SubjectResponse)
async def create_subject(
    subject_data: SubjectCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new subject"""
    try:
        # Check permissions (admin only)
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can create subjects"
            )
        
        # Check if subject code already exists
        existing = await Subject.find_one({"code": subject_data.code})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subject code already exists"
            )
        
        subject = Subject(
            code=subject_data.code,
            name=subject_data.name,
            description=subject_data.description,
            credits=subject_data.credits,
            department=subject_data.department,
            faculty=subject_data.faculty,
            prerequisite_subjects=subject_data.prerequisite_subjects
        )
        
        await subject.save()
        logger.info(f"Subject created: {subject.code} - {subject.name} by {current_user.email}")
        
        return SubjectResponse(
            id=str(subject.id),
            code=subject.code,
            name=subject.name,
            description=subject.description,
            credits=subject.credits,
            department=subject.department,
            faculty=subject.faculty,
            prerequisite_subjects=subject.prerequisite_subjects,
            primary_instructor_id=str(subject.primary_instructor_id) if subject.primary_instructor_id else None,
            instructors=[str(instructor_id) for instructor_id in subject.instructors],
            total_documents=subject.total_documents,
            total_students=subject.total_students,
            is_active=subject.is_active,
            created_at=subject.created_at,
            updated_at=subject.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subject: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subject"
        )

@router.patch("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: str,
    subject_data: SubjectUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a subject"""
    try:
        # Check permissions (admin only)
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can update subjects"
            )
        
        subject = await Subject.get(PydanticObjectId(subject_id))
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )
        
        # Update fields
        update_data = subject_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(subject, field, value)
        
        subject.updated_at = datetime.utcnow()
        await subject.save()
        
        logger.info(f"Subject updated: {subject.code} by {current_user.email}")
        
        return SubjectResponse(
            id=str(subject.id),
            code=subject.code,
            name=subject.name,
            description=subject.description,
            credits=subject.credits,
            department=subject.department,
            faculty=subject.faculty,
            prerequisite_subjects=subject.prerequisite_subjects,
            primary_instructor_id=str(subject.primary_instructor_id) if subject.primary_instructor_id else None,
            instructors=[str(instructor_id) for instructor_id in subject.instructors],
            total_documents=subject.total_documents,
            total_students=subject.total_students,
            is_active=subject.is_active,
            created_at=subject.created_at,
            updated_at=subject.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subject {subject_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update subject"
        )

@router.post("/subjects/recalculate-documents")
async def recalculate_document_counts(
    current_user: User = Depends(get_current_user)
):
    """Recalculate document counts for all subjects"""
    try:
        # Check permissions (admin only)
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can recalculate document counts"
            )
        
        subjects = await Subject.find().to_list()
        updated_count = 0
        
        for subject in subjects:
            # Count actual documents for this subject
            actual_count = await LibraryDocument.find({"subject_code": subject.code}).count()
            
            # Update if different
            if subject.total_documents != actual_count:
                subject.total_documents = actual_count
                subject.updated_at = datetime.utcnow()
                await subject.save()
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to recalculate document counts"
        )
