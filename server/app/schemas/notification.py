from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from ..models.notification import NotificationType


class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.GENERAL
    link_url: Optional[str] = None


class NotificationCreate(NotificationBase):
    user_id_target: UUID


class NotificationUpdate(BaseModel):
    read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: str | int
    user_id_target: UUID
    read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_supabase_dict(cls, data: dict) -> "NotificationResponse":
        from ..services.notification_service import normalize_notification_type

        notification_type = normalize_notification_type(
            data.get("type") or NotificationType.GENERAL.value
        )
        created_at_raw = data.get("created_at")
        created_at_value = (
            datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
            if isinstance(created_at_raw, str)
            else datetime.utcnow()
        )
        return cls.model_validate(
            {
                "id": data.get("id"),
                "title": data.get("title"),
                "message": data.get("message"),
                "type": notification_type,
                "link_url": data.get("link_url"),
                "user_id_target": data.get("user_id_target"),
                "read": bool(
                    data.get("read_status")
                    if "read_status" in data
                    else data.get("read")
                ),
                "created_at": created_at_value,
            }
        )


class NotificationBulkCreate(BaseModel):
    """Schema for creating notifications for multiple users"""

    title: str
    message: str
    type: NotificationType = NotificationType.GENERAL
    link_url: Optional[str] = None
    user_ids: Optional[list[UUID]] = None  # If None, create for all users


class NotificationPreferences(BaseModel):
    system: bool = True
    instructor: bool = True
    alert: bool = True
    general: bool = True


class NotificationPreferencesUpdate(BaseModel):
    system: Optional[bool] = None
    instructor: Optional[bool] = None
    alert: Optional[bool] = None
    general: Optional[bool] = None
