"""
Notifications API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict
import logging

from ....schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationBulkCreate,
    NotificationPreferences,
    NotificationPreferencesUpdate,
)
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_supervisor_user,
    get_current_user_profile,
)
from ....services.notification_service import (
    create_notification,
    create_bulk_notifications,
    get_user_notifications,
    get_unread_count,
    mark_notification_read,
    mark_all_read
)
from ....services.notification_service import (
    DEFAULT_NOTIFICATION_PREFERENCES,
)
from ....models.notification import NotificationType
from ....models.user import Profile
from ....core.database import get_db_session_write
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
router = APIRouter()


def _merge_preferences(raw: Dict | None) -> Dict[str, bool]:
    preferences = DEFAULT_NOTIFICATION_PREFERENCES.copy()
    if isinstance(raw, dict):
        raw_prefs = raw.get("notification_preferences", raw)
        if isinstance(raw_prefs, dict):
            for key in preferences.keys():
                if isinstance(raw_prefs.get(key), bool):
                    preferences[key] = raw_prefs[key]
    return preferences


def _categories_from_preferences(preferences: Dict[str, bool]) -> List[NotificationType]:
    categories: List[NotificationType] = []
    for key, enabled in preferences.items():
        if not enabled:
            continue
        if key in NotificationType._value2member_map_:
            categories.append(NotificationType(key))
    return categories


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to return"),
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    unread_only: bool = Query(False, description="Only return unread notifications"),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    profile: Profile = Depends(get_current_user_profile),
) -> List[NotificationResponse]:
    """Get user's notifications"""
    try:
        preferences = _merge_preferences(getattr(profile, "extra_metadata", None))
        if not any(preferences.values()):
            return []
        allowed_categories = _categories_from_preferences(preferences)

        notifications = get_user_notifications(
            user_id=current_user.user_id,
            limit=limit,
            skip=skip,
            unread_only=unread_only,
            allowed_categories=allowed_categories if allowed_categories else None,
        )

        return [NotificationResponse.from_supabase_dict(n) for n in notifications]

    except Exception as e:
        logger.error(f"Error listing notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


@router.get("/unread", response_model=dict)
async def get_unread_notifications_count(
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    profile: Profile = Depends(get_current_user_profile),
) -> dict:
    """Get unread notification count"""
    try:
        preferences = _merge_preferences(getattr(profile, "extra_metadata", None))
        if not any(preferences.values()):
            return {"unread_count": 0}
        allowed_categories = _categories_from_preferences(preferences)
        count = get_unread_count(
            user_id=current_user.user_id,
            allowed_categories=allowed_categories if allowed_categories else None,
        )

        return {"unread_count": count}

    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail="Failed to get unread count")


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
):
    """Mark a notification as read"""
    try:
        notification = mark_notification_read(
            notification_id=notification_id,
            user_id=current_user.user_id,
        )
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return NotificationResponse.from_supabase_dict(notification)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")


@router.post("/mark-all-read", response_model=dict)
def mark_all_notifications_read(
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
):
    """Mark all notifications as read"""
    try:
        count = mark_all_read(user_id=current_user.user_id)
        
        return {"marked_count": count}
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read")


@router.post("/", response_model=NotificationResponse)
def create_notification_endpoint(
    notification_data: NotificationCreate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
):
    """Create a notification (Admin/Instructor only)"""
    try:
        notification = create_notification(notification_data=notification_data)
        
        return NotificationResponse.from_supabase_dict(notification)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to create notification")


@router.post("/bulk", response_model=dict)
def create_bulk_notifications_endpoint(
    notification_data: NotificationBulkCreate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
):
    """Create notifications for multiple users (Admin/Instructor only)"""
    try:
        notifications = create_bulk_notifications(notification_data=notification_data)
        
        return {
            "created_count": len(notifications),
            "notifications": [NotificationResponse.model_validate(n) for n in notifications]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating bulk notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to create bulk notifications")


@router.get("/preferences", response_model=NotificationPreferences)
async def get_notification_preferences_endpoint(
    profile: Profile = Depends(get_current_user_profile),
) -> NotificationPreferences:
    preferences = _merge_preferences(getattr(profile, "extra_metadata", None))
    return NotificationPreferences(**preferences)


@router.patch("/preferences", response_model=NotificationPreferences)
async def update_notification_preferences_endpoint(
    preferences_update: NotificationPreferencesUpdate,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_write),
) -> NotificationPreferences:
    profile = await db.get(Profile, current_user.user_id)
    if not profile:
        raise HTTPException(
            status_code=404, detail="Hồ sơ người dùng không tồn tại"
        )

    current_preferences = _merge_preferences(getattr(profile, "extra_metadata", None))
    update_payload = preferences_update.model_dump(exclude_unset=True)
    for key, value in update_payload.items():
        if key in current_preferences and value is not None:
            current_preferences[key] = bool(value)

    extra_metadata = profile.extra_metadata or {}
    extra_metadata["notification_preferences"] = current_preferences
    profile.extra_metadata = extra_metadata

    await db.commit()
    await db.refresh(profile)

    return NotificationPreferences(**current_preferences)

