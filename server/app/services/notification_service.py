"""
Notification service for creating and managing notifications

This service now inserts notifications directly into Supabase (notifications table)
to enable real-time updates via Supabase Realtime.
"""

from typing import Dict, List, Optional, Union
from uuid import UUID
import logging
import sqlalchemy as sa
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..schemas.notification import NotificationCreate, NotificationBulkCreate
from ..models.notification import Notification, NotificationType

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


def normalize_notification_type(
    value: Union[str, NotificationType],
) -> NotificationType:
    if isinstance(value, NotificationType):
        return value
    lowered = (value or "").lower()
    if lowered in NotificationType._value2member_map_:
        return NotificationType(lowered)
    return LEGACY_TYPE_MAP.get(lowered, NotificationType.GENERAL)


async def create_notification(
    notification_data: NotificationCreate,
    db: AsyncSession,
) -> Notification:
    """
    Create a single notification for a user in Supabase notifications_realtime table

    Args:
        db: Database session (for user lookup)
        notification_data: Notification data

    Returns:
        Created notification record (dict format)
    """
    normalized_type = normalize_notification_type(notification_data.type)

    notification = Notification(
        user_id_target=notification_data.user_id_target,
        title=notification_data.title,
        message=notification_data.message,
        type=normalized_type,
        link_url=notification_data.link_url,
        read=False,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    logger.info(
        "Notification created: %s for user %s",
        notification.id,
        notification_data.user_id_target,
    )
    return notification


async def create_bulk_notifications(
    notification_data: NotificationBulkCreate,
    db: AsyncSession,
) -> List[Notification]:
    """
    Create notifications for multiple users in Supabase (for real-time updates)

    Args:
        db: Database session (for user lookup)
        notification_data: Notification data with optional user_ids list
                          If user_ids is None, create for all active users

    Returns:
        List of created notification ORM instances
    """
    normalized_type = normalize_notification_type(notification_data.type)

    if notification_data.user_ids is None:
        query = sa.text(
            """
            SELECT u.id
            FROM auth.users AS u
            WHERE u.banned_until IS NULL OR u.banned_until <= NOW()
            ORDER BY u.created_at DESC
        """
        )
        result = await db.execute(query)
        user_ids = [
            UUID(str(row[0])) for row in result.fetchall() if row[0] is not None
        ]
    else:
        user_ids = [UUID(str(uid)) for uid in notification_data.user_ids]

    if not user_ids:
        logger.warning("No users found to create notifications for")
        return []

    notifications: List[Notification] = []
    for user_id in user_ids:
        notifications.append(
            Notification(
                user_id_target=user_id,
                title=notification_data.title,
                message=notification_data.message,
                type=normalized_type,
                link_url=notification_data.link_url,
                read=False,
            )
        )

    db.add_all(notifications)
    await db.commit()
    for notification in notifications:
        await db.refresh(notification)

    logger.info(
        "Created %s notifications for %s users",
        len(notifications),
        len(user_ids),
    )
    return notifications


async def get_user_notifications(
    *,
    db: AsyncSession,
    user_id: Union[UUID, str],
    limit: int = 50,
    skip: int = 0,
    unread_only: bool = False,
    allowed_categories: Optional[List[NotificationType]] = None,
) -> List[Notification]:
    query = select(Notification).where(
        Notification.user_id_target == UUID(str(user_id))
    )

    if unread_only:
        query = query.where(Notification.read.is_(False))

    if allowed_categories:
        query = query.where(Notification.type.in_(allowed_categories))

    query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    notifications = list(result.scalars().all())
    logger.info("Fetched %s notifications for user %s", len(notifications), user_id)
    return notifications


async def get_unread_count(
    *,
    db: AsyncSession,
    user_id: Union[UUID, str],
    allowed_categories: Optional[List[NotificationType]] = None,
) -> int:
    query = select(func.count(Notification.id)).where(
        Notification.user_id_target == UUID(str(user_id)),
        Notification.read.is_(False),
    )
    if allowed_categories:
        query = query.where(Notification.type.in_(allowed_categories))

    result = await db.execute(query)
    count = result.scalar_one() or 0
    logger.info("Unread count for user %s: %s", user_id, count)
    return count


async def mark_notification_read(
    *,
    db: AsyncSession,
    notification_id: Union[int, str],
    user_id: Union[UUID, str],
) -> Optional[Notification]:
    notification_id_int = int(notification_id)
    query = select(Notification).where(
        Notification.id == notification_id_int,
        Notification.user_id_target == UUID(str(user_id)),
    )
    result = await db.execute(query)
    notification = result.scalar_one_or_none()
    if not notification:
        return None

    if not bool(notification.read):
        setattr(notification, "read", True)
        await db.commit()
        await db.refresh(notification)

    logger.info("Notification %s marked as read for user %s", notification_id, user_id)
    return notification


async def mark_all_read(
    *,
    db: AsyncSession,
    user_id: Union[UUID, str],
) -> int:
    stmt = (
        update(Notification)
        .where(
            Notification.user_id_target == UUID(str(user_id)),
            Notification.read.is_(False),
        )
        .values(read=True)
        .returning(Notification.id)
    )
    result = await db.execute(stmt)
    updated_ids = list(result.scalars().all())
    await db.commit()
    logger.info(
        "Marked %s notifications as read for user %s", len(updated_ids), user_id
    )
    return len(updated_ids)
