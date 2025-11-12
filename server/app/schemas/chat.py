from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from .user import User
from .course import Subject


class ChatSessionBase(BaseModel):
    chat_type: str
    subject_id: Optional[int] = None
    title: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatSessionCreate(ChatSessionBase):
    pass


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ChatSessionInDBBase(ChatSessionBase):
    id: int
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatSessionResponse(ChatSessionInDBBase):
    user: Optional[User] = None
    subject: Optional[Subject] = None


class ChatMessageBase(BaseModel):
    content: str


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageUpdate(BaseModel):
    content: Optional[str] = None


class ChatMessageInDBBase(ChatMessageBase):
    id: int
    session_id: int
    role: str
    message_metadata: Optional[Dict[str, Any]] = None
    tokens_used: Optional[int] = None
    response_time_ms: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageResponse(ChatMessageInDBBase):
    pass


class ChatStreamResponse(BaseModel):
    content: Optional[str] = None
    type: str  # 'chunk', 'complete', 'error'
    error: Optional[str] = None


class ChatFeedbackBase(BaseModel):
    rating: Optional[int] = None
    feedback_text: Optional[str] = None
    is_helpful: Optional[bool] = None


class ChatFeedbackCreate(ChatFeedbackBase):
    session_id: Optional[int] = None
    message_id: Optional[int] = None


class ChatFeedbackInDBBase(ChatFeedbackBase):
    id: int
    session_id: Optional[int] = None
    message_id: Optional[int] = None
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ChatFeedbackResponse(ChatFeedbackInDBBase):
    pass
