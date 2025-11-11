"""
Admin API endpoints for user role management
"""
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func

from ....models.user import User
from ....models.content import Material, MaterialEmbedding
from ....models.assessment import Assessment
from ....models.test_result import TestResult
from ....schemas.admin import (
    RoleUpdateRequest, 
    UserListResponse,
    AIDataItemResponse,
    AIDataStatsResponse
)
from ....core.database import get_db
from ....middleware.auth import get_current_admin_user
from ....middleware.rate_limiter import clear_rate_limit_store

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/users/{user_id}/set-role",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin_user)]
)
def set_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
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
            detail=f"Vai trò không hợp lệ. Vai trò hợp lệ: {', '.join(valid_roles)}"
        )
    
    try:
        # Get target user
        result = db.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update role based on request
        if request.role == "admin":
            target_user.is_superuser = True
            target_user.is_instructor = False
        elif request.role == "instructor":
            target_user.is_superuser = False
            target_user.is_instructor = True
        elif request.role == "student":
            target_user.is_superuser = False
            target_user.is_instructor = False
        
        db.commit()
        db.refresh(target_user)
        
        logger.info(
            f"User {user_id} role updated to '{request.role}' by admin {current_user.id}"
        )
        
        return None  # 204 No Content
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật vai trò: {str(e)}"
        )


@router.get(
    "/users",
    response_model=List[UserListResponse],
    dependencies=[Depends(get_current_admin_user)]
)
def list_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of users to return"),
    search: Optional[str] = Query(None, description="Search by email, username, or full_name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
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
        query = select(User)
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    User.email.ilike(search_term),
                    User.username.ilike(search_term),
                    User.full_name.ilike(search_term)
                )
            )
        
        # Apply pagination
        query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
        
        result = db.execute(query)
        users = result.scalars().all()
        
        # Convert to response format with role and statistics
        user_responses = []
        for user in users:
            # Determine role based on flags
            if user.is_superuser:
                role = "admin"
            elif user.is_instructor:
                role = "instructor"
            else:
                role = "student"
            
            # Calculate statistics
            total_assessments = 0
            total_results = 0
            
            if user.is_instructor or user.is_superuser:
                # Count assessments created by this instructor
                assessments_count = db.query(func.count(Assessment.id)).filter(
                    Assessment.created_by == user.id
                ).scalar() or 0
                total_assessments = assessments_count
            
            if role == "student":
                # Count test results for this student
                results_count = db.query(func.count(TestResult.id)).filter(
                    TestResult.user_id == user.id
                ).scalar() or 0
                total_results = results_count
            
            user_dict = {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "is_instructor": user.is_instructor,
                "email_verified": bool(user.email_verified) if hasattr(user, "email_verified") else False,
                "avatar_url": user.avatar_url,
                "created_at": user.created_at,
                "role": role,
                "total_assessments": total_assessments,
                "total_results": total_results,
            }
            user_responses.append(UserListResponse.model_validate(user_dict))
        
        return user_responses
        
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )


@router.post(
    "/rate-limit/clear",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_admin_user)]
)
def clear_rate_limit(
    current_user: User = Depends(get_current_admin_user)
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
        logger.info(f"Rate limit store cleared by admin {current_user.id}")
        return {"message": "Rate limit store cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing rate limit store: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear rate limit store"
        )


# ===============================
# AI Data Management Endpoints
# ===============================

@router.get(
    "/ai-data",
    response_model=List[AIDataItemResponse],
    dependencies=[Depends(get_current_admin_user)]
)
def list_ai_data(
    search: Optional[str] = Query(None, description="Search by title or description"),
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    status: Optional[str] = Query(None, description="Filter by status: PENDING, INDEXING, COMPLETED, FAILED"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get list of AI data (materials with embeddings) - Admin only
    
    Args:
        search: Search term for title or description
        subject_id: Filter by subject ID
        status: Filter by processing status
        skip: Number of items to skip
        limit: Number of items to return
        db: Database session
        current_user: Current admin user
    
    Returns:
        List of AI data items with embeddings stats
    """
    try:
        from sqlalchemy import func, case
        from ....models.organization import Subject
        
        # Build query with embeddings count
        query = db.query(
            Material,
            func.count(MaterialEmbedding.id).label('embeddings_count'),
            func.count(func.distinct(MaterialEmbedding.chunk_id)).label('chunks_count')
        ).outerjoin(
            MaterialEmbedding, Material.id == MaterialEmbedding.material_id
        )
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Material.title.ilike(search_term),
                    Material.description.ilike(search_term)
                )
            )
        
        if subject_id:
            query = query.filter(Material.subject_id == subject_id)
        
        # Group by material to get counts
        query = query.group_by(Material.id)
        
        # Apply pagination
        query = query.order_by(Material.created_at.desc()).offset(skip).limit(limit)
        
        results = query.all()
        
        # Convert to response format
        ai_data_items = []
        for material, embeddings_count, chunks_count in results:
            # Determine status based on embeddings
            if embeddings_count == 0:
                material_status = "PENDING"
                status_text = "Chưa xử lý"
            else:
                material_status = "COMPLETED"
                status_text = "Đã xử lý"
            
            # Get subject name if available
            subject_name = None
            if material.subject:
                subject_name = material.subject.name
            
            # Get uploader name
            uploader_name = None
            if material.uploader:
                uploader_name = material.uploader.full_name or material.uploader.username
            
            # Get file size from metadata if available
            file_size = None
            if material.file_metadata and isinstance(material.file_metadata, dict):
                file_size = material.file_metadata.get('file_size')
            
            ai_data_items.append(AIDataItemResponse(
                id=material.id,
                title=material.title,
                description=material.description,
                file_type=material.file_type,
                file_url=material.file_url,
                file_size=file_size,
                subject_id=material.subject_id,
                subject_name=subject_name,
                uploaded_by=material.uploaded_by,
                uploader_name=uploader_name,
                upload_date=material.created_at,
                last_processed=material.updated_at,
                status=material_status,
                status_text=status_text,
                embeddings_count=embeddings_count or 0,
                chunks_count=chunks_count or 0,
                usage_count=0,  # TODO: Add usage tracking
                tags=None,  # TODO: Add tags support
                is_published=material.is_published,
                created_at=material.created_at,
                updated_at=material.updated_at
            ))
        
        logger.info(f"Retrieved {len(ai_data_items)} AI data items for admin {current_user.id}")
        return ai_data_items
        
    except Exception as e:
        logger.error(f"Error listing AI data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch AI data: {str(e)}"
        )


@router.get(
    "/ai-data/stats",
    response_model=AIDataStatsResponse,
    dependencies=[Depends(get_current_admin_user)]
)
def get_ai_data_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
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
        from sqlalchemy import func, case
        
        # Get total materials
        total_materials = db.query(func.count(Material.id)).scalar() or 0
        
        # Get materials with embeddings (processed)
        processed_materials = db.query(func.count(func.distinct(MaterialEmbedding.material_id))).scalar() or 0
        
        # Get total embeddings and chunks
        total_embeddings = db.query(func.count(MaterialEmbedding.id)).scalar() or 0
        total_chunks = db.query(func.count(func.distinct(MaterialEmbedding.chunk_id))).scalar() or 0
        
        # Calculate processing and failed (materials without embeddings)
        processing_materials = 0  # TODO: Add processing status tracking
        failed_materials = total_materials - processed_materials - processing_materials
        
        # Usage count (TODO: Add usage tracking)
        total_usage = 0
        
        stats = AIDataStatsResponse(
            total_materials=total_materials,
            processed_materials=processed_materials,
            processing_materials=processing_materials,
            failed_materials=failed_materials,
            total_embeddings=total_embeddings,
            total_chunks=total_chunks,
            total_usage=total_usage
        )
        
        logger.info(f"Retrieved AI data stats for admin {current_user.id}")
        return stats
        
    except Exception as e:
        logger.error(f"Error getting AI data stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch AI data stats: {str(e)}"
        )

