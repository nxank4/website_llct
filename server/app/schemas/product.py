from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProductType(str, Enum):
    PROJECT = "project"
    ASSIGNMENT = "assignment"
    PRESENTATION = "presentation"
    OTHER = "other"


class ProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    subject_name: Optional[str] = None
    group: Optional[str] = None
    members: Optional[List[str]] = None
    instructor: Optional[str] = None
    semester: Optional[str] = None
    type: Optional[ProductType] = None
    technologies: Optional[List[str]] = None
    file_url: Optional[str] = None
    demo_url: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    subject_name: Optional[str] = None
    group: Optional[str] = None
    members: Optional[List[str]] = None
    instructor: Optional[str] = None
    semester: Optional[str] = None
    type: Optional[ProductType] = None
    technologies: Optional[List[str]] = None
    file_url: Optional[str] = None
    demo_url: Optional[str] = None


class ProductResponse(ProductBase):
    id: int
    downloads: int = 0
    views: int = 0
    submitted_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

