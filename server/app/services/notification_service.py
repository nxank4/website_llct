"""
Notification service for creating and managing notifications
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
import logging

from ..models.notification import Notification, NotificationType
from ..models.user import User
from ..schemas.notification import NotificationCreate, NotificationBulkCreate

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    notification_data: NotificationCreate
) -> Notification:
    """
    Create a single notification for a user
    
    Args:
        db: Database session
        notification_data: Notification data
        
    Returns:
        Created notification
    """
    try:
        notification = Notification(
            user_id=notification_data.user_id,
            title=notification_data.title,
            message=notification_data.message,
            type=notification_data.type,
            link_url=notification_data.link_url,
            read=False
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        logger.info(f"Notification created: {notification.id} for user {notification.user_id}")
        return notification
        
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        db.rollback()
        raise


def create_bulk_notifications(
    db: Session,
    notification_data: NotificationBulkCreate
) -> List[Notification]:
    """
    Create notifications for multiple users
    
    Args:
        db: Database session
        notification_data: Notification data with optional user_ids list
                          If user_ids is None, create for all active users
        
    Returns:
        List of created notifications
    """
    try:
        # Get user IDs
        if notification_data.user_ids:
            user_ids = notification_data.user_ids
        else:
            # Get all active users
            result = db.execute(select(User.id).where(User.is_active == True))
            user_ids = [row[0] for row in result]
        
        if not user_ids:
            logger.warning("No users found to create notifications for")
            return []
        
        # Create notifications for all users
        notifications = []
        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                title=notification_data.title,
                message=notification_data.message,
                type=notification_data.type,
                link_url=notification_data.link_url,
                read=False
            )
            notifications.append(notification)
        
        # Bulk insert
        db.add_all(notifications)
        db.commit()
        
        # Refresh all notifications
        for notification in notifications:
            db.refresh(notification)
        
        logger.info(f"Created {len(notifications)} notifications for {len(user_ids)} users")
        return notifications
        
    except Exception as e:
        logger.error(f"Error creating bulk notifications: {e}")
        db.rollback()
        raise


def get_user_notifications(
    db: Session,
    user_id: int,
    limit: int = 50,
    skip: int = 0,
    unread_only: bool = False
) -> List[Notification]:
    """
    Get notifications for a user
    
    Args:
        db: Database session
        user_id: User ID
        limit: Maximum number of notifications to return
        skip: Number of notifications to skip
        unread_only: If True, only return unread notifications
        
    Returns:
        List of notifications
    """
    try:
        query = select(Notification).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(Notification.read == False)
        
        query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
        
        result = db.execute(query)
        notifications = result.scalars().all()
        
        return list(notifications)
        
    except Exception as e:
        logger.error(f"Error getting user notifications: {e}")
        raise


def get_unread_count(db: Session, user_id: int) -> int:
    """
    Get unread notification count for a user
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        Unread notification count
    """
    try:
        from sqlalchemy import func as sql_func
        
        result = db.execute(
            select(sql_func.count(Notification.id))
            .where(Notification.user_id == user_id)
            .where(Notification.read == False)
        )
        count = result.scalar() or 0
        
        return count
        
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise


def mark_notification_read(db: Session, notification_id: int, user_id: int) -> Optional[Notification]:
    """
    Mark a notification as read
    
    Args:
        db: Database session
        notification_id: Notification ID
        user_id: User ID (for security check)
        
    Returns:
        Updated notification or None if not found
    """
    try:
        result = db.execute(
            select(Notification)
            .where(Notification.id == notification_id)
            .where(Notification.user_id == user_id)
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            return None
        
        notification.read = True
        db.commit()
        db.refresh(notification)
        
        logger.info(f"Notification {notification_id} marked as read for user {user_id}")
        return notification
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        db.rollback()
        raise


def mark_all_read(db: Session, user_id: int) -> int:
    """
    Mark all notifications as read for a user
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        Number of notifications marked as read
    """
    try:
        result = db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.read == False)
        )
        notifications = result.scalars().all()
        
        count = len(notifications)
        for notification in notifications:
            notification.read = True
        
        db.commit()
        
        logger.info(f"Marked {count} notifications as read for user {user_id}")
        return count
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        db.rollback()
        raise

