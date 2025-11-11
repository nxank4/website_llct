"""
Notifications API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from sqlalchemy.orm import Session

from ....models.user import User
from ....schemas.notification import NotificationCreate, NotificationResponse, NotificationBulkCreate
from ....core.database import get_db
from ....middleware.auth import get_current_user
from ....services.notification_service import (
    create_notification,
    create_bulk_notifications,
    get_user_notifications,
    get_unread_count,
    mark_notification_read,
    mark_all_read
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to return"),
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    unread_only: bool = Query(False, description="Only return unread notifications"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notifications"""
    try:
        notifications = get_user_notifications(
            db=db,
            user_id=current_user.id,
            limit=limit,
            skip=skip,
            unread_only=unread_only
        )
        
        return [NotificationResponse.model_validate(n) for n in notifications]
        
    except Exception as e:
        logger.error(f"Error listing notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


@router.get("/unread", response_model=dict)
def get_unread_notifications_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get unread notification count"""
    try:
        count = get_unread_count(db=db, user_id=current_user.id)
        
        return {"unread_count": count}
        
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail="Failed to get unread count")


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read"""
    try:
        notification = mark_notification_read(
            db=db,
            notification_id=notification_id,
            user_id=current_user.id
        )
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return NotificationResponse.model_validate(notification)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")


@router.post("/mark-all-read", response_model=dict)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read"""
    try:
        count = mark_all_read(db=db, user_id=current_user.id)
        
        return {"marked_count": count}
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read")


@router.post("/", response_model=NotificationResponse)
def create_notification_endpoint(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a notification (Admin/Instructor only)"""
    try:
        # Check permissions
        if not current_user.is_superuser and not current_user.is_instructor:
            raise HTTPException(status_code=403, detail="Admin or instructor access required")
        
        # Verify user exists
        from sqlalchemy import select
        result = db.execute(select(User).where(User.id == notification_data.user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        notification = create_notification(db=db, notification_data=notification_data)
        
        return NotificationResponse.model_validate(notification)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to create notification")


@router.post("/bulk", response_model=dict)
def create_bulk_notifications_endpoint(
    notification_data: NotificationBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create notifications for multiple users (Admin/Instructor only)"""
    try:
        # Check permissions
        if not current_user.is_superuser and not current_user.is_instructor:
            raise HTTPException(status_code=403, detail="Admin or instructor access required")
        
        notifications = create_bulk_notifications(db=db, notification_data=notification_data)
        
        return {
            "created_count": len(notifications),
            "notifications": [NotificationResponse.model_validate(n) for n in notifications]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating bulk notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to create bulk notifications")

