from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
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
    user_id: int
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


class DebateRoomBase(BaseModel):
    title: str
    topic: str
    subject_id: Optional[int] = None
    max_participants: int = 10
    settings: Optional[Dict[str, Any]] = None


class DebateRoomCreate(DebateRoomBase):
    pass


class DebateRoomUpdate(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    max_participants: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class DebateRoomInDBBase(DebateRoomBase):
    id: int
    created_by: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DebateRoomResponse(DebateRoomInDBBase):
    creator: Optional[User] = None
    subject: Optional[Subject] = None
    participant_count: Optional[int] = None


class DebateParticipantBase(BaseModel):
    position: Optional[str] = None


class DebateParticipantCreate(DebateParticipantBase):
    pass


class DebateParticipantInDBBase(DebateParticipantBase):
    id: int
    room_id: int
    user_id: int
    joined_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class DebateParticipantResponse(DebateParticipantInDBBase):
    user: Optional[User] = None


class DebateMessageBase(BaseModel):
    content: str
    position: Optional[str] = None


class DebateMessageCreate(DebateMessageBase):
    pass


class DebateMessageInDBBase(DebateMessageBase):
    id: int
    room_id: int
    user_id: int
    is_ai_generated: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DebateMessageResponse(DebateMessageInDBBase):
    user: Optional[User] = None


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
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatFeedbackResponse(ChatFeedbackInDBBase):
    pass
