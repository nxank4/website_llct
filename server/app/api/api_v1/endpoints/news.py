"""
News API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import List, Optional
from beanie import PydanticObjectId
from datetime import datetime
import re
import logging

from app.models.mongodb_models import (
    News, 
    NewsCreate, 
    NewsUpdate, 
    NewsResponse,
    NewsStatus,
    User
)
from app.api.api_v1.endpoints.mongodb_auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

def create_slug(title: str) -> str:
    """Create URL-friendly slug from title"""
    # Convert to lowercase and replace spaces with hyphens
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')

@router.get("/", response_model=List[NewsResponse])
async def list_news(
    status: Optional[NewsStatus] = Query(None, description="Filter by status"),
    is_featured: Optional[bool] = Query(None, description="Filter by featured status"),
    author_id: Optional[str] = Query(None, description="Filter by author"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    current_user: User = Depends(get_current_user)
):
    """Get list of news articles"""
    try:
        # Build query
        query = {}
        if status:
            query["status"] = status
        if is_featured is not None:
            query["is_featured"] = is_featured
        if author_id:
            query["author_id"] = author_id
            
        # For non-admin users, only show published articles
        if not current_user.is_superuser:
            query["status"] = NewsStatus.PUBLISHED
            
        news_list = await News.find(query).sort(-News.created_at).skip(skip).limit(limit).to_list()
        
        return [
            NewsResponse(
                id=str(news.id),
                title=news.title,
                slug=news.slug,
                content=news.content,
                excerpt=news.excerpt,
                author_id=news.author_id,
                author_name=news.author_name,
                status=news.status,
                featured_image=news.featured_image,
                media=news.media,
                tags=news.tags,
                views=news.views,
                likes=news.likes,
                is_featured=news.is_featured,
                published_at=news.published_at,
                created_at=news.created_at,
                updated_at=news.updated_at
            ) for news in news_list
        ]
    except Exception as e:
        logger.error(f"Error listing news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch news")

@router.get("/{news_id}", response_model=NewsResponse)
async def get_news(
    news_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific news article"""
    try:
        news = await News.get(PydanticObjectId(news_id))
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
            
        # Check permissions
        if news.status != NewsStatus.PUBLISHED and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Increment view count for published articles
        if news.status == NewsStatus.PUBLISHED:
            news.views += 1
            await news.save()
            
        return NewsResponse(
            id=str(news.id),
            title=news.title,
            slug=news.slug,
            content=news.content,
            excerpt=news.excerpt,
            author_id=news.author_id,
            author_name=news.author_name,
            status=news.status,
            featured_image=news.featured_image,
            media=news.media,
            tags=news.tags,
            views=news.views,
            likes=news.likes,
            is_featured=news.is_featured,
            published_at=news.published_at,
            created_at=news.created_at,
            updated_at=news.updated_at
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid news ID")
    except Exception as e:
        logger.error(f"Error getting news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch news")

@router.post("/", response_model=NewsResponse)
async def create_news(
    news_data: NewsCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new news article (Admin only)"""
    try:
        # Check admin permissions
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin access required")
            
        # Create slug from title
        slug = create_slug(news_data.title)
        
        # Check if slug already exists
        existing_news = await News.find_one(News.slug == slug)
        if existing_news:
            # Add timestamp to make it unique
            slug = f"{slug}-{int(datetime.utcnow().timestamp())}"
            
        # Set published_at if status is published
        published_at = None
        if news_data.status == NewsStatus.PUBLISHED:
            published_at = datetime.utcnow()
            
        news = News(
            title=news_data.title,
            slug=slug,
            content=news_data.content,
            excerpt=news_data.excerpt,
            author_id=str(current_user.id),
            author_name=current_user.full_name,
            status=news_data.status,
            featured_image=news_data.featured_image,
            media=news_data.media,
            tags=news_data.tags,
            is_featured=news_data.is_featured,
            published_at=published_at
        )
        
        await news.insert()
        logger.info(f"News created: {news.title} by {current_user.email}")
        
        return NewsResponse(
            id=str(news.id),
            title=news.title,
            slug=news.slug,
            content=news.content,
            excerpt=news.excerpt,
            author_id=news.author_id,
            author_name=news.author_name,
            status=news.status,
            featured_image=news.featured_image,
            media=news.media,
            tags=news.tags,
            views=news.views,
            likes=news.likes,
            is_featured=news.is_featured,
            published_at=news.published_at,
            created_at=news.created_at,
            updated_at=news.updated_at
        )
    except Exception as e:
        logger.error(f"Error creating news: {e}")
        raise HTTPException(status_code=500, detail="Failed to create news")

@router.patch("/{news_id}", response_model=NewsResponse)
async def update_news(
    news_id: str,
    news_data: NewsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a news article (Admin only)"""
    try:
        # Check admin permissions
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin access required")
            
        news = await News.get(PydanticObjectId(news_id))
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
            
        # Update fields
        update_data = news_data.dict(exclude_unset=True)
        
        # Update slug if title changed
        if "title" in update_data:
            new_slug = create_slug(update_data["title"])
            existing_news = await News.find_one(News.slug == new_slug, News.id != news.id)
            if existing_news:
                new_slug = f"{new_slug}-{int(datetime.utcnow().timestamp())}"
            update_data["slug"] = new_slug
            
        # Set published_at if status changed to published
        if "status" in update_data and update_data["status"] == NewsStatus.PUBLISHED and not news.published_at:
            update_data["published_at"] = datetime.utcnow()
            
        # Update timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        for field, value in update_data.items():
            setattr(news, field, value)
            
        await news.save()
        logger.info(f"News updated: {news.title} by {current_user.email}")
        
        return NewsResponse(
            id=str(news.id),
            title=news.title,
            slug=news.slug,
            content=news.content,
            excerpt=news.excerpt,
            author_id=news.author_id,
            author_name=news.author_name,
            status=news.status,
            featured_image=news.featured_image,
            media=news.media,
            tags=news.tags,
            views=news.views,
            likes=news.likes,
            is_featured=news.is_featured,
            published_at=news.published_at,
            created_at=news.created_at,
            updated_at=news.updated_at
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid news ID")
    except Exception as e:
        logger.error(f"Error updating news: {e}")
        raise HTTPException(status_code=500, detail="Failed to update news")

@router.delete("/{news_id}")
async def delete_news(
    news_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a news article (Admin only)"""
    try:
        # Check admin permissions
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin access required")
            
        news = await News.get(PydanticObjectId(news_id))
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
            
        await news.delete()
        logger.info(f"News deleted: {news.title} by {current_user.email}")
        
        return {"message": "News deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid news ID")
    except Exception as e:
        logger.error(f"Error deleting news: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete news")

@router.get("/public/featured", response_model=List[NewsResponse])
async def get_featured_news(
    limit: int = Query(5, ge=1, le=20, description="Number of featured articles")
):
    """Get featured news for homepage (public endpoint)"""
    try:
        news_list = await News.find(
            News.status == NewsStatus.PUBLISHED,
            News.is_featured == True
        ).sort(-News.published_at).limit(limit).to_list()
        
        return [
            NewsResponse(
                id=str(news.id),
                title=news.title,
                slug=news.slug,
                content=news.content,
                excerpt=news.excerpt,
                author_id=news.author_id,
                author_name=news.author_name,
                status=news.status,
                featured_image=news.featured_image,
                media=news.media,
                tags=news.tags,
                views=news.views,
                likes=news.likes,
                is_featured=news.is_featured,
                published_at=news.published_at,
                created_at=news.created_at,
                updated_at=news.updated_at
            ) for news in news_list
        ]
    except Exception as e:
        logger.error(f"Error getting featured news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch featured news")

@router.get("/public/latest", response_model=List[NewsResponse])
async def get_latest_news(
    limit: int = Query(10, ge=1, le=50, description="Number of latest articles")
):
    """Get latest published news (public endpoint)"""
    try:
        news_list = await News.find(
            News.status == NewsStatus.PUBLISHED
        ).sort(-News.published_at).limit(limit).to_list()
        
        return [
            NewsResponse(
                id=str(news.id),
                title=news.title,
                slug=news.slug,
                content=news.content,
                excerpt=news.excerpt,
                author_id=news.author_id,
                author_name=news.author_name,
                status=news.status,
                featured_image=news.featured_image,
                media=news.media,
                tags=news.tags,
                views=news.views,
                likes=news.likes,
                is_featured=news.is_featured,
                published_at=news.published_at,
                created_at=news.created_at,
                updated_at=news.updated_at
            ) for news in news_list
        ]
    except Exception as e:
        logger.error(f"Error getting latest news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch latest news")
