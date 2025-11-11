from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from ..models.notification import NotificationType


class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.ANNOUNCEMENT
    link_url: Optional[str] = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationUpdate(BaseModel):
    read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationBulkCreate(BaseModel):
    """Schema for creating notifications for multiple users"""
    title: str
    message: str
    type: NotificationType = NotificationType.ANNOUNCEMENT
    link_url: Optional[str] = None
    user_ids: Optional[list[int]] = None  # If None, create for all users

