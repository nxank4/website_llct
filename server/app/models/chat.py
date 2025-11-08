from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class ChatType(str, enum.Enum):
    Q_AND_A = "q_and_a"
    DEBATE = "debate"
    SOCRATIC = "socratic"
    GENERAL = "general"


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chat_type = Column(Enum(ChatType), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    title = Column(String, nullable=True)
    context = Column(JSON, nullable=True)  # Additional context for the chat
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User")
    subject = relationship("Subject")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    message_metadata = Column(JSON, nullable=True)  # For storing additional message data
    tokens_used = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="messages")


class DebateRoom(Base):
    __tablename__ = "debate_rooms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    topic = Column(Text, nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    max_participants = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    settings = Column(JSON, nullable=True)  # Debate room settings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subject = relationship("Subject")
    creator = relationship("User")
    participants = relationship("DebateParticipant", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("DebateMessage", back_populates="room", cascade="all, delete-orphan")


class DebateParticipant(Base):
    __tablename__ = "debate_participants"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("debate_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    position = Column(String, nullable=True)  # For/Against position
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    # Relationships
    room = relationship("DebateRoom", back_populates="participants")
    user = relationship("User")


class DebateMessage(Base):
    __tablename__ = "debate_messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("debate_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    position = Column(String, nullable=True)  # For/Against
    is_ai_generated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    room = relationship("DebateRoom", back_populates="messages")
    user = relationship("User")


class ChatFeedback(Base):
    __tablename__ = "chat_feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=True)  # 1-5 scale
    feedback_text = Column(Text, nullable=True)
    is_helpful = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession")
    message = relationship("ChatMessage")
    user = relationship("User")
