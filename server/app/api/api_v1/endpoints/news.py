"""
News API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
import re
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, desc

from ....models.news import News, NewsStatus
from ....models.user import User
from ....models.notification import NotificationType
from ....schemas.news import NewsCreate, NewsUpdate, NewsResponse
from ....schemas.notification import NotificationBulkCreate
from ....core.database import get_db, get_read_db
from ....middleware.auth import get_current_user
from ....services.notification_service import create_bulk_notifications

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
    author_id: Optional[int] = Query(None, description="Filter by author"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of news articles"""
    try:
        # Build query
        query = select(News)
        
        # Apply filters
        conditions = []
        if status:
            conditions.append(News.status == status)
        if is_featured is not None:
            conditions.append(News.is_featured == is_featured)
        if author_id:
            conditions.append(News.author_id == author_id)
            
        # For non-admin users, only show published articles
        if not current_user.is_superuser:
            conditions.append(News.status == NewsStatus.PUBLISHED)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Order by created_at descending
        query = query.order_by(desc(News.created_at))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = db.execute(query)
        news_list = result.scalars().all()
        
        return [NewsResponse.model_validate(news) for news in news_list]
    except Exception as e:
        logger.error(f"Error listing news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch news")


@router.get("/{news_id}", response_model=NewsResponse)
async def get_news(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific news article"""
    try:
        result = db.execute(select(News).where(News.id == news_id))
        news = result.scalar_one_or_none()
        
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
            
        # Check permissions
        if news.status != NewsStatus.PUBLISHED and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Increment view count for published articles
        if news.status == NewsStatus.PUBLISHED:
            news.views += 1
            db.commit()
            db.refresh(news)
            
        return NewsResponse.model_validate(news)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch news")


@router.post("/", response_model=NewsResponse)
async def create_news(
    news_data: NewsCreate,
    db: Session = Depends(get_db),
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
        result = db.execute(select(News).where(News.slug == slug))
        existing_news = result.scalar_one_or_none()
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
            author_id=current_user.id,
            author_name=current_user.full_name,
            status=news_data.status,
            featured_image=news_data.featured_image,
            media=news_data.media,
            tags=news_data.tags,
            is_featured=news_data.is_featured,
            published_at=published_at
        )
        
        db.add(news)
        db.commit()
        db.refresh(news)
        logger.info(f"News created: {news.title} by {current_user.email}")
        
        # Create notification for all users if news is published
        if news_data.status == NewsStatus.PUBLISHED:
            try:
                notification_data = NotificationBulkCreate(
                    title="Tin tức mới",
                    message=f"{news.title}",
                    type=NotificationType.NEWS,
                    link_url=f"/news/{news.slug}",
                    user_ids=None  # Create for all users
                )
                create_bulk_notifications(db=db, notification_data=notification_data)
                logger.info(f"Notification created for news: {news.title}")
            except Exception as e:
                logger.error(f"Error creating notification for news: {e}")
                # Don't fail the news creation if notification fails
        
        return NewsResponse.model_validate(news)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating news: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create news")


@router.patch("/{news_id}", response_model=NewsResponse)
async def update_news(
    news_id: int,
    news_data: NewsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a news article (Admin only)"""
    try:
        # Check admin permissions
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin access required")
            
        result = db.execute(select(News).where(News.id == news_id))
        news = result.scalar_one_or_none()
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
            
        # Update fields
        update_data = news_data.dict(exclude_unset=True)
        
        # Update slug if title changed
        if "title" in update_data:
            new_slug = create_slug(update_data["title"])
            result = db.execute(select(News).where(and_(News.slug == new_slug, News.id != news_id)))
            existing_news = result.scalar_one_or_none()
            if existing_news:
                new_slug = f"{new_slug}-{int(datetime.utcnow().timestamp())}"
            update_data["slug"] = new_slug
            
        # Set published_at if status changed to published
        status_changed_to_published = False
        if "status" in update_data and update_data["status"] == NewsStatus.PUBLISHED and not news.published_at:
            update_data["published_at"] = datetime.utcnow()
            status_changed_to_published = True
            
        # Update timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        for field, value in update_data.items():
            setattr(news, field, value)
            
        db.commit()
        db.refresh(news)
        logger.info(f"News updated: {news.title} by {current_user.email}")
        
        # Create notification for all users if status changed to published
        if status_changed_to_published:
            try:
                notification_data = NotificationBulkCreate(
                    title="Tin tức mới",
                    message=f"{news.title}",
                    type=NotificationType.NEWS,
                    link_url=f"/news/{news.slug}",
                    user_ids=None  # Create for all users
                )
                create_bulk_notifications(db=db, notification_data=notification_data)
                logger.info(f"Notification created for news: {news.title}")
            except Exception as e:
                logger.error(f"Error creating notification for news: {e}")
                # Don't fail the news update if notification fails
        
        return NewsResponse.model_validate(news)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating news: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update news")


@router.delete("/{news_id}")
async def delete_news(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a news article (Admin only)"""
    try:
        # Check admin permissions
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin access required")
            
        result = db.execute(select(News).where(News.id == news_id))
        news = result.scalar_one_or_none()
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
            
        db.delete(news)
        db.commit()
        logger.info(f"News deleted: {news.title} by {current_user.email}")
        
        return {"message": "News deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting news: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete news")


@router.get("/public/featured", response_model=List[NewsResponse])
async def get_featured_news(
    limit: int = Query(5, ge=1, le=20, description="Number of featured articles"),
    db: Session = Depends(get_read_db)
):
    """Get featured news for homepage (public endpoint)"""
    try:
        query = select(News).where(
            and_(
                News.status == NewsStatus.PUBLISHED,
                News.is_featured == True
            )
        ).order_by(desc(News.published_at)).limit(limit)
        
        result = db.execute(query)
        news_list = result.scalars().all()
        
        return [NewsResponse.model_validate(news) for news in news_list]
    except Exception as e:
        logger.error(f"Error getting featured news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch featured news")


@router.get("/public/latest", response_model=List[NewsResponse])
async def get_latest_news(
    limit: int = Query(10, ge=1, le=50, description="Number of latest articles"),
    db: Session = Depends(get_read_db)
):
    """Get latest published news (public endpoint)"""
    try:
        query = select(News).where(
            News.status == NewsStatus.PUBLISHED
        )
        
        # Order by published_at if available, otherwise by created_at
        # Handle null published_at values
        from sqlalchemy import case
        query = query.order_by(
            desc(
                case(
                    (News.published_at.isnot(None), News.published_at),
                    else_=News.created_at
                )
            )
        ).limit(limit)
        
        result = db.execute(query)
        news_list = result.scalars().all()
        
        # If no news found, return empty array
        # Frontend will handle the empty array and show appropriate message
        if not news_list:
            logger.info("No published news found in database")
            return []
        
        return [NewsResponse.model_validate(news) for news in news_list]
    except Exception as e:
        logger.error(f"Error getting latest news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch latest news")
