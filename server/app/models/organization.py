from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    INSTRUCTOR = "instructor"
    STUDENT = "student"


class Domain(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    classes = relationship("Class", back_populates="domain", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="domain", cascade="all, delete-orphan")


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)
    instructor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    domain = relationship("Domain", back_populates="classes")
    instructor = relationship(
        "Profile",
        foreign_keys=[instructor_id],
        primaryjoin="Class.instructor_id==Profile.id",
        viewonly=True,
    )
    enrollments = relationship("ClassEnrollment", back_populates="class_", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="class_", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    domain = relationship("Domain", back_populates="subjects")
    class_ = relationship("Class", back_populates="subjects")
    materials = relationship("Material", back_populates="subject", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="subject", cascade="all, delete-orphan")


class ClassEnrollment(Base):
    __tablename__ = "class_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="ClassEnrollment.user_id==Profile.id",
        viewonly=True,
    )
    class_ = relationship("Class", back_populates="enrollments")


class UserRoleAssignment(Base):
    __tablename__ = "user_role_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(Enum(UserRole), nullable=False)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_by = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship(
        "Profile",
        foreign_keys=[user_id],
        primaryjoin="UserRoleAssignment.user_id==Profile.id",
        viewonly=True,
    )
    domain = relationship("Domain")
    class_ = relationship("Class")
    assigner = relationship(
        "Profile",
        foreign_keys=[assigned_by],
        primaryjoin="UserRoleAssignment.assigned_by==Profile.id",
        viewonly=True,
    )
