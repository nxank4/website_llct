from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from uuid import UUID


class NewsStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class NewsBase(BaseModel):
    title: str
    content: str
    excerpt: Optional[str] = None
    status: NewsStatus = NewsStatus.DRAFT
    featured_image: Optional[str] = None
    media: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_featured: bool = False


class NewsCreate(NewsBase):
    pass


class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    status: Optional[NewsStatus] = None
    featured_image: Optional[str] = None
    media: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_featured: Optional[bool] = None


class NewsResponse(NewsBase):
    id: int
    slug: str
    author_id: UUID
    author_name: str
    views: int = 0
    likes: int = 0
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    reading_time_minutes: int = Field(
        1, description="Estimated reading time in minutes"
    )

    class Config:
        from_attributes = True

