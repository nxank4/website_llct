"""
Notification service for creating and managing notifications

This service now inserts notifications directly into Supabase (notifications table)
to enable real-time updates via Supabase Realtime.
"""

from typing import List, Optional, Union, Dict
from uuid import UUID
import logging

from ..schemas.notification import NotificationCreate, NotificationBulkCreate
from ..models.notification import NotificationType
from ..core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

DEFAULT_NOTIFICATION_PREFERENCES: Dict[str, bool] = {
    NotificationType.SYSTEM.value: True,
    NotificationType.INSTRUCTOR.value: True,
    NotificationType.ALERT.value: True,
    NotificationType.GENERAL.value: True,
}

LEGACY_TYPE_MAP = {
    "news": NotificationType.GENERAL,
    "document": NotificationType.INSTRUCTOR,
    "assignment": NotificationType.INSTRUCTOR,
    "announcement": NotificationType.SYSTEM,
}

CATEGORY_TO_DB_TYPES = {
    NotificationType.SYSTEM: ["system", "announcement"],
    NotificationType.INSTRUCTOR: ["instructor", "document", "assignment"],
    NotificationType.ALERT: ["alert"],
    NotificationType.GENERAL: ["general", "news"],
}


def normalize_notification_type(value: Union[str, NotificationType]) -> NotificationType:
    if isinstance(value, NotificationType):
        return value
    lowered = (value or "").lower()
    if lowered in NotificationType._value2member_map_:
        return NotificationType(lowered)
    return LEGACY_TYPE_MAP.get(lowered, NotificationType.GENERAL)


def _categories_to_supabase_types(
    categories: List[NotificationType],
) -> List[str]:
    supabase_types: List[str] = []
    for category in categories:
        supabase_types.extend(CATEGORY_TO_DB_TYPES.get(category, [category.value]))
    return list(dict.fromkeys(supabase_types))


def create_notification(notification_data: NotificationCreate) -> dict:
    """
    Create a single notification for a user in Supabase notifications_realtime table

    Args:
        db: Database session (for user lookup)
        notification_data: Notification data

    Returns:
        Created notification record (dict format)
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            logger.error("Supabase client not available, cannot create notification")
            raise Exception("Supabase client not configured")

        normalized_type = normalize_notification_type(notification_data.type)

        # Prepare notification data
        notification_to_insert = {
            "user_id_target": str(notification_data.user_id_target),
            "title": notification_data.title,
            "message": notification_data.message,
            "type": normalized_type.value,
            "link_url": notification_data.link_url,
            "read_status": False,
        }

        # Insert into Supabase
        response = (
            supabase.table("notifications_realtime")
            .insert(notification_to_insert)
            .execute()
        )

        if not response.data or len(response.data) == 0:
            raise Exception("Failed to create notification in Supabase")

        created_notification = response.data[0]  # type: ignore
        notification_id = (
            created_notification.get("id", "unknown")
            if isinstance(created_notification, dict)
            else str(created_notification)
        )
        logger.info(
            f"Notification created: {notification_id} for user {notification_data.user_id_target}"
        )
        return created_notification  # type: ignore

    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        raise


def create_bulk_notifications(notification_data: NotificationBulkCreate) -> List[dict]:
    """
    Create notifications for multiple users in Supabase (for real-time updates)

    Args:
        db: Database session (for user lookup)
        notification_data: Notification data with optional user_ids list
                          If user_ids is None, create for all active users

    Returns:
        List of created notification records (dict format)
    """
    try:
        supabase = get_supabase_client()
        if not supabase:
            logger.error("Supabase client not available, cannot create notifications")
            raise Exception("Supabase client not configured")

        user_ids = (
            list(notification_data.user_ids) if notification_data.user_ids else []
        )

        if not user_ids:
            logger.warning("No users found to create notifications for")
            return []

        # Prepare notification data for bulk insert
        notifications_to_insert = []
        for uuid in user_ids:
            normalized_type = normalize_notification_type(notification_data.type)
            notifications_to_insert.append(
                {
                    "user_id_target": str(uuid),
                    "title": notification_data.title,
                    "message": notification_data.message,
                    "type": normalized_type.value,
                    "link_url": notification_data.link_url,
                    "read_status": False,
                }
            )

        # Bulk insert into Supabase
        response = (
            supabase.table("notifications_realtime")
            .insert(notifications_to_insert)
            .execute()
        )

        created_notifications = response.data if response.data else []

        logger.info(
            f"Created {len(created_notifications)} notifications in Supabase for {len(user_ids)} users"
        )
        return created_notifications  # type: ignore

    except Exception as e:
        logger.error(f"Error creating bulk notifications in Supabase: {e}")
        raise


def get_user_notifications(
    user_id: Union[UUID, str],
    limit: int = 50,
    skip: int = 0,
    unread_only: bool = False,
    allowed_categories: Optional[List[NotificationType]] = None,
) -> List[dict]:
    """
    Get notifications for a user from Supabase notifications_realtime table

    Args:
        user_id: Supabase auth.users UUID (string)
        limit: Maximum number of notifications to return
        skip: Number of notifications to skip
        unread_only: If True, only return unread notifications

    Returns:
        List of notification records (dict format)
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            logger.warning(
                "Supabase client not available, returning empty notifications for %s",
                user_id,
            )
            return []

        # Build query
        query = (
            supabase.table("notifications_realtime")
            .select("*")
            .eq("user_id_target", str(user_id))
        )

        if unread_only:
            query = query.eq("read_status", False)

        if allowed_categories is not None:
            allowed_values = _categories_to_supabase_types(allowed_categories)
            if not allowed_values:
                return []
            query = query.in_("type", allowed_values)

        query = query.order("created_at", desc=True).range(skip, skip + limit - 1)

        response = query.execute()

        notifications = response.data if response.data else []
        logger.info(f"Fetched {len(notifications)} notifications for user {user_id}")
        return notifications  # type: ignore

    except Exception as e:
        logger.error(f"Error getting user notifications: {e}")
        raise


def get_unread_count(
    user_id: Union[UUID, str],
    allowed_categories: Optional[List[NotificationType]] = None,
) -> int:
    """
    Get unread notification count for a user from Supabase notifications_realtime table

    Args:
        user_id: Supabase auth.users UUID (string)

    Returns:
        Unread notification count
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            logger.warning(
                "Supabase client not available, returning unread count 0 for %s",
                user_id,
            )
            return 0

        # Count unread notifications - fetch all and count (Supabase count may not work as expected)
        query = (
            supabase.table("notifications_realtime")
            .select("id")
            .eq("user_id_target", str(user_id))
            .eq("read_status", False)
        )
        if allowed_categories is not None:
            allowed_values = _categories_to_supabase_types(allowed_categories)
            if not allowed_values:
                return 0
            query = query.in_("type", allowed_values)
        response = query.execute()

        count = len(response.data) if response.data else 0
        logger.info(f"Unread count for user %s: %s", user_id, count)
        return count

    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise


def mark_notification_read(
    notification_id: Union[UUID, str],
    user_id: Union[UUID, str],
) -> Optional[dict]:
    """
    Mark a notification as read in Supabase notifications_realtime table

    Args:
        notification_id: Notification UUID (string)
        user_id: Supabase auth.users UUID (string) for ownership check

    Returns:
        Updated notification record (dict) or None if not found
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            logger.error(
                "Supabase client not available, cannot mark notification as read"
            )
            raise Exception("Supabase client not configured")

        # Update notification
        response = (
            supabase.table("notifications_realtime")
            .update({"read_status": True})
            .eq("id", str(notification_id))
            .eq("user_id_target", str(user_id))  # Security check
            .execute()
        )

        if not response.data or len(response.data) == 0:
            logger.warning(
                f"Notification {notification_id} not found or not owned by user {user_id}"
            )
            return None

        updated_notification = response.data[0]  # type: ignore
        logger.info(
            "Notification %s marked as read for user %s", notification_id, user_id
        )
        return updated_notification  # type: ignore

    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise


def mark_all_read(user_id: Union[UUID, str]) -> int:
    """
    Mark all notifications as read for a user in Supabase notifications_realtime table

    Args:
        user_id: Supabase auth.users UUID (string)

    Returns:
        Number of notifications marked as read
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            logger.error("Supabase client not available, cannot mark all as read")
            raise Exception("Supabase client not configured")

        # Update all unread notifications
        response = (
            supabase.table("notifications_realtime")
            .update({"read_status": True})
            .eq("user_id_target", str(user_id))
            .eq("read_status", False)
            .execute()
        )

        count = len(response.data) if response.data else 0
        logger.info("Marked %s notifications as read for user %s", count, user_id)
        return count

    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise
