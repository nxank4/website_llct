from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from ..models.notification import NotificationType


class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.ANNOUNCEMENT
    link_url: Optional[str] = None


class NotificationCreate(NotificationBase):
    user_id_target: UUID


class NotificationUpdate(BaseModel):
    read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id_target: UUID
    read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationBulkCreate(BaseModel):
    """Schema for creating notifications for multiple users"""

    title: str
    message: str
    type: NotificationType = NotificationType.ANNOUNCEMENT
    link_url: Optional[str] = None
    user_ids: Optional[list[UUID]] = None  # If None, create for all users
