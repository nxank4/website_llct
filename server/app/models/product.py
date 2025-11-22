from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Enum
from sqlalchemy.sql import func
from ..core.database import Base
import enum


class ProductType(str, enum.Enum):
    PROJECT = "project"
    ASSIGNMENT = "assignment"
    PRESENTATION = "presentation"
    OTHER = "other"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    subject = Column(String, nullable=True, index=True)  # Subject code
    subject_name = Column(String, nullable=True)
    group = Column(String, nullable=True)
    members = Column(JSON, nullable=True)  # Array of member names
    instructor = Column(String, nullable=True)
    semester = Column(String, nullable=True, index=True)
    type = Column(Enum(ProductType), nullable=True)
    technologies = Column(JSON, nullable=True)  # Array of technologies
    file_url = Column(String, nullable=True)
    demo_url = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)  # Product thumbnail image URL
    content_html = Column(Text, nullable=True)  # Rich text editor content
    downloads = Column(Integer, default=0)
    views = Column(Integer, default=0)
    submitted_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

