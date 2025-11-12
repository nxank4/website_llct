from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class NotificationType(str, enum.Enum):
    NEWS = "news"
    DOCUMENT = "document"
    ANNOUNCEMENT = "announcement"
    ASSIGNMENT = "assignment"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id_target = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False, default=NotificationType.ANNOUNCEMENT)
    link_url = Column(String, nullable=True)
    read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    recipient = relationship(
        "Profile",
        foreign_keys=[user_id_target],
        primaryjoin="Notification.user_id_target==Profile.id",
        viewonly=True,
    )

