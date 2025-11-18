"""
News API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional, Dict, Tuple
from typing import cast as typing_cast
from datetime import datetime, timezone
from uuid import UUID
import re
import logging
import math
import time
import json
from collections import Counter, defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    select,
    and_,
    or_,
    desc,
    asc,
    case,
    delete,
    cast,
    String,
)

from ....models.news import News, NewsStatus
from ....models.notification import NotificationType
from ....models.user import Profile
from ....schemas.news import NewsCreate, NewsUpdate, NewsResponse
from ....schemas.notification import NotificationBulkCreate
from ....core.database import get_db_session_write, get_db_session_read
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_admin_user,
    get_current_user_profile,
)
from ....services.notification_service import create_bulk_notifications

logger = logging.getLogger(__name__)
router = APIRouter()

NEWS_FILTER_CACHE: Dict[str, Tuple[float, List[NewsResponse]]] = {}
NEWS_CACHE_TTL_SECONDS = 120


def create_slug(title: str) -> str:
    """Create URL-friendly slug from title"""
    # Convert to lowercase and replace spaces with hyphens
    slug = re.sub(r"[^\w\s-]", "", title.lower())
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug.strip("-")


def _calculate_reading_time(content: Optional[str]) -> int:
    if not content:
        return 1
    words = re.findall(r"\w+", content)
    return max(1, math.ceil(len(words) / 200))


def _bucket_reading_time(minutes: int) -> str:
    if minutes <= 3:
        return "≤3 phút"
    if minutes <= 6:
        return "4-6 phút"
    if minutes <= 10:
        return "7-10 phút"
    return "≥11 phút"


def _build_cache_key(params: Dict[str, Optional[str]]) -> str:
    return json.dumps(params, sort_keys=True, default=str)


def _get_cached_news(cache_key: str) -> Optional[List[NewsResponse]]:
    cached = NEWS_FILTER_CACHE.get(cache_key)
    if not cached:
        return None
    ts, payload = cached
    if time.time() - ts > NEWS_CACHE_TTL_SECONDS:
        NEWS_FILTER_CACHE.pop(cache_key, None)
        return None
    return payload


def _set_cached_news(cache_key: str, data: List[NewsResponse]) -> None:
    NEWS_FILTER_CACHE[cache_key] = (time.time(), data)


def _invalidate_news_cache() -> None:
    NEWS_FILTER_CACHE.clear()


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _news_to_response(news: News) -> NewsResponse:
    base = NewsResponse.model_validate(news)
    return base.model_copy(
        update={
            "reading_time_minutes": _calculate_reading_time(
                getattr(news, "content", "")
            ),
            "media": getattr(news, "media", []) or [],
            "tags": getattr(news, "tags", []) or [],
        }
    )


@router.get("/", response_model=List[NewsResponse])
async def list_news(
    status: Optional[NewsStatus] = Query(None, description="Filter by status"),
    is_featured: Optional[bool] = Query(None, description="Filter by featured status"),
    author_id: Optional[UUID] = Query(None, description="Filter by author"),
    q: Optional[str] = Query(
        None, description="Search by title, excerpt, content or tags"
    ),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get list of news articles"""
    try:
        query = select(News)

        conditions = []
        if status:
            conditions.append(News.status == status)
        if is_featured is not None:
            conditions.append(News.is_featured == is_featured)
        if author_id:
            conditions.append(News.author_id == author_id)
        if q:
            search = f"%{q.lower()}%"
            conditions.append(
                or_(
                    News.title.ilike(search),
                    News.excerpt.ilike(search),
                    News.content.ilike(search),
                    cast(News.tags, String).ilike(search),
                )
            )

        if current_user.role != "admin":
            conditions.append(News.status == NewsStatus.PUBLISHED)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(desc(News.created_at))
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        news_list = result.scalars().all()

        return [_news_to_response(news) for news in news_list]
    except Exception as e:
        logger.error(f"Error listing news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch news")


@router.get("/{news_id}", response_model=NewsResponse)
async def get_news(
    news_id: int,
    db: AsyncSession = Depends(get_db_session_write),
):
    """Get a specific news article"""
    try:
        result = await db.execute(select(News).where(News.id == news_id))
        news = result.scalar_one_or_none()

        if not news:
            raise HTTPException(status_code=404, detail="News not found")

        # RLS will handle permission checking automatically
        # If user doesn't have access, RLS will filter it out

        status_attr = typing_cast(Optional[NewsStatus], getattr(news, "status", None))

        if status_attr == NewsStatus.PUBLISHED:
            current_views = typing_cast(Optional[int], getattr(news, "views", 0)) or 0
            setattr(news, "views", current_views + 1)
            await db.commit()
            await db.refresh(news)

        return _news_to_response(news)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch news")


@router.post("/", response_model=NewsResponse)
async def create_news(
    news_data: NewsCreate,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    current_profile: Profile = Depends(get_current_user_profile),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Create a new news article (Admin only)"""
    try:
        # Create slug from title
        slug = create_slug(news_data.title)

        # Check if slug already exists
        result = await db.execute(select(News).where(News.slug == slug))
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
            author_id=current_user.user_id,
            author_name=current_profile.full_name or current_user.claims.get("name"),
            status=news_data.status,
            featured_image=news_data.featured_image,
            media=news_data.media,
            tags=news_data.tags,
            is_featured=news_data.is_featured,
            published_at=published_at,
        )

        db.add(news)
        await db.commit()
        await db.refresh(news)
        _invalidate_news_cache()
        logger.info(
            "News created: %s by %s",
            news.title,
            current_user.email or current_user.user_id,
        )

        # Create notification for all users if news is published
        if news_data.status == NewsStatus.PUBLISHED:
            try:
                notification_data = NotificationBulkCreate(
                    title="Tin tức mới",
                    message=f"{news.title}",
                    type=NotificationType.SYSTEM,
                    link_url=f"/news/{news.slug}",
                    user_ids=None,  # Create for all users
                )
                create_bulk_notifications(notification_data=notification_data)
                logger.info("Notification created for news: %s", news.title)
            except Exception as e:
                logger.error(f"Error creating notification for news: {e}")
                # Don't fail the news creation if notification fails

        return _news_to_response(news)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating news: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create news")


@router.patch("/{news_id}", response_model=NewsResponse)
async def update_news(
    news_id: int,
    news_data: NewsUpdate,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Update a news article (Admin only)"""
    try:
        result = await db.execute(select(News).where(News.id == news_id))
        news = result.scalar_one_or_none()
        if not news:
            raise HTTPException(status_code=404, detail="News not found")

        # Update fields
        update_data = news_data.dict(exclude_unset=True)

        # Update slug if title changed
        if "title" in update_data:
            new_slug = create_slug(update_data["title"])
            result = await db.execute(
                select(News).where(and_(News.slug == new_slug, News.id != news_id))
            )
            existing_news = result.scalar_one_or_none()
            if existing_news:
                new_slug = f"{new_slug}-{int(datetime.utcnow().timestamp())}"
            update_data["slug"] = new_slug

        # Set published_at if status changed to published
        status_changed_to_published = False
        current_published_at = typing_cast(
            Optional[datetime], getattr(news, "published_at", None)
        )
        if (
            "status" in update_data
            and update_data["status"] == NewsStatus.PUBLISHED
            and current_published_at is None
        ):
            update_data["published_at"] = datetime.utcnow()
            status_changed_to_published = True

        # Update timestamp
        update_data["updated_at"] = datetime.utcnow()

        for field, value in update_data.items():
            setattr(news, field, value)

        await db.commit()
        await db.refresh(news)
        _invalidate_news_cache()
        logger.info(
            "News updated: %s by %s",
            news.title,
            current_user.email or current_user.user_id,
        )

        # Create notification for all users if status changed to published
        if status_changed_to_published:
            try:
                notification_data = NotificationBulkCreate(
                    title="Tin tức mới",
                    message=f"{news.title}",
                    type=NotificationType.SYSTEM,
                    link_url=f"/news/{news.slug}",
                    user_ids=None,  # Create for all users
                )
                create_bulk_notifications(notification_data=notification_data)
                logger.info("Notification created for news: %s", news.title)
            except Exception as e:
                logger.error(f"Error creating notification for news: {e}")
                # Don't fail the news update if notification fails

        return _news_to_response(news)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating news: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update news")


@router.delete("/{news_id}")
async def delete_news(
    news_id: int,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Delete a news article (Admin only)"""
    try:
        result = await db.execute(select(News).where(News.id == news_id))
        news = result.scalar_one_or_none()
        if not news:
            raise HTTPException(status_code=404, detail="News not found")

        await db.execute(delete(News).where(News.id == news_id))
        await db.commit()
        _invalidate_news_cache()
        logger.info(
            "News deleted: %s by %s",
            news.title,
            current_user.email or current_user.user_id,
        )

        return {"message": "News deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting news: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete news")


@router.get("/public/featured", response_model=List[NewsResponse])
async def get_featured_news(
    limit: int = Query(5, ge=1, le=20, description="Number of featured articles"),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get featured news for homepage (public endpoint)"""
    try:
        query = (
            select(News)
            .where(
                and_(
                    News.status == NewsStatus.PUBLISHED,
                    News.is_featured.is_(True),  # type: ignore[arg-type]
                )
            )
            .order_by(desc(News.published_at))
            .limit(limit)
        )

        result = await db.execute(query)
        news_list = result.scalars().all()

        return [_news_to_response(news) for news in news_list]
    except Exception as e:
        logger.error(f"Error getting featured news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch featured news")


@router.get("/public/latest", response_model=List[NewsResponse])
async def get_latest_news(
    limit: int = Query(10, ge=1, le=50, description="Number of latest articles"),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Get latest published news (public endpoint)"""
    try:
        query = select(News).where(News.status == NewsStatus.PUBLISHED)

        # Order by published_at if available, otherwise by created_at
        # Handle null published_at values
        query = query.order_by(
            desc(
                case(
                    (News.published_at.isnot(None), News.published_at),
                    else_=News.created_at,
                )
            )
        ).limit(limit)

        result = await db.execute(query)
        news_list = result.scalars().all()

        # If no news found, return empty array
        # Frontend will handle the empty array and show appropriate message
        if not news_list:
            logger.info("No published news found in database")
            return []

        return [_news_to_response(news) for news in news_list]
    except Exception as e:
        logger.error(f"Error getting latest news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch latest news")


@router.get("/public/search", response_model=List[NewsResponse])
async def search_public_news(
    q: Optional[str] = Query(None, description="Search text"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    author: Optional[str] = Query(None, description="Filter by author name"),
    featured: Optional[bool] = Query(None, description="Only featured news"),
    date_from: Optional[str] = Query(
        None, description="ISO date string for start date filter"
    ),
    date_to: Optional[str] = Query(
        None, description="ISO date string for end date filter"
    ),
    sort: str = Query(
        "newest",
        description="Sort order",
        pattern="^(newest|oldest|views)$",
    ),
    limit: int = Query(40, ge=1, le=100, description="Number of records"),
    db: AsyncSession = Depends(get_db_session_read),
):
    """Advanced search endpoint for public news listing."""
    try:
        params_snapshot: Dict[str, Optional[str]] = {
            "q": q or "",
            "tag": tag or "",
            "author": author or "",
            "featured": str(featured) if featured is not None else "",
            "date_from": date_from or "",
            "date_to": date_to or "",
            "sort": sort,
            "limit": str(limit),
        }
        cache_key = _build_cache_key(params_snapshot)
        cached = _get_cached_news(cache_key)
        if cached:
            return cached

        query = select(News).where(News.status == NewsStatus.PUBLISHED)

        if q:
            search = f"%{q.lower()}%"
            query = query.where(
                or_(
                    News.title.ilike(search),
                    News.excerpt.ilike(search),
                    News.content.ilike(search),
                )
            )

        if tag:
            query = query.where(News.tags.contains([tag]))

        if author:
            query = query.where(News.author_name.ilike(f"%{author}%"))

        if featured is not None:
            query = query.where(News.is_featured.is_(featured))

        date_from_dt = _parse_iso_datetime(date_from)
        if date_from_dt:
            query = query.where(News.published_at >= date_from_dt)

        date_to_dt = _parse_iso_datetime(date_to)
        if date_to_dt:
            query = query.where(News.published_at <= date_to_dt)

        if sort == "views":
            query = query.order_by(desc(News.views), desc(News.published_at))
        elif sort == "oldest":
            query = query.order_by(asc(News.published_at), asc(News.created_at))
        else:
            query = query.order_by(desc(News.published_at), desc(News.created_at))

        query = query.limit(limit)
        result = await db.execute(query)
        news_list = result.scalars().all()
        responses = [_news_to_response(news) for news in news_list]
        _set_cached_news(cache_key, responses)
        return responses
    except Exception as e:
        logger.error(f"Error searching news: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search news",
        )


@router.get("/public/by-slug/{slug}", response_model=NewsResponse)
async def get_news_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db_session_write),
):
    """Get published news by slug (public endpoint)"""
    try:
        query = select(News).where(
            and_(News.slug == slug, News.status == NewsStatus.PUBLISHED)
        )
        result = await db.execute(query)
        news = result.scalar_one_or_none()

        if not news:
            raise HTTPException(status_code=404, detail="News not found")

        current_views = typing_cast(Optional[int], getattr(news, "views", 0)) or 0
        setattr(news, "views", current_views + 1)
        await db.commit()
        await db.refresh(news)

        return _news_to_response(news)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting news by slug: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch news")


@router.get(
    "/analytics/dashboard",
    dependencies=[Depends(get_current_admin_user)],
)
async def get_news_dashboard_analytics(
    db: AsyncSession = Depends(get_db_session_read),
):
    """Aggregate analytics for news dashboard (Admin only)."""
    try:
        result = await db.execute(select(News))
        news_list = result.scalars().all()

        if not news_list:
            return {
                "totals": {
                    "total": 0,
                    "published": 0,
                    "draft": 0,
                    "archived": 0,
                    "featured": 0,
                    "total_views": 0,
                    "avg_views": 0,
                    "avg_reading_time": 0,
                },
                "publishing_trend": [],
                "top_articles": [],
                "tag_distribution": [],
                "reading_time_distribution": [],
            }

        status_counter: Counter[str] = Counter()
        tag_counter: Counter[str] = Counter()
        reading_times: list[int] = []
        month_counter: defaultdict[str, int] = defaultdict(int)
        total_views = 0
        featured = 0

        for news in news_list:
            status_attr = getattr(news, "status", None)
            if isinstance(status_attr, NewsStatus):
                status_value = status_attr.value
            else:
                status_value = typing_cast(Optional[str], status_attr)
            status_counter[status_value or "unknown"] += 1

            if bool(getattr(news, "is_featured", False)):
                featured += 1

            content_value = (
                typing_cast(Optional[str], getattr(news, "content", "")) or ""
            )
            reading_time = _calculate_reading_time(content_value)
            reading_times.append(reading_time)

            views_value = typing_cast(Optional[int], getattr(news, "views", 0)) or 0
            total_views += views_value

            published_at_value = typing_cast(
                Optional[datetime], getattr(news, "published_at", None)
            )
            created_at_value = typing_cast(
                Optional[datetime], getattr(news, "created_at", None)
            )
            timestamp: Optional[datetime] = published_at_value or created_at_value
            if timestamp is not None:
                month_key = timestamp.strftime("%Y-%m")
                month_counter[month_key] += 1

            tags_value = getattr(news, "tags", None)
            if isinstance(tags_value, list):
                for tag in tags_value:
                    tag_str = str(tag).strip()
                    if tag_str:
                        tag_counter[tag_str] += 1

        avg_views = total_views / len(news_list)
        avg_reading_time = (
            sum(reading_times) / len(reading_times) if reading_times else 0
        )

        reading_bucket_counter = Counter(
            [_bucket_reading_time(rt) for rt in reading_times]
        )

        publishing_trend = [
            {"month": month, "count": count}
            for month, count in sorted(month_counter.items())
        ]

        top_articles = sorted(
            news_list,
            key=lambda n: typing_cast(Optional[int], getattr(n, "views", 0)) or 0,
            reverse=True,
        )[:5]

        bucket_order = ["≤3 phút", "4-6 phút", "7-10 phút", "≥11 phút"]

        return {
            "totals": {
                "total": len(news_list),
                "published": status_counter.get(NewsStatus.PUBLISHED.value, 0),
                "draft": status_counter.get(NewsStatus.DRAFT.value, 0),
                "archived": status_counter.get(NewsStatus.ARCHIVED.value, 0),
                "featured": featured,
                "total_views": total_views,
                "avg_views": round(avg_views, 1),
                "avg_reading_time": round(avg_reading_time, 1),
            },
            "publishing_trend": publishing_trend[-8:],
            "top_articles": [
                {
                    "id": article.id,
                    "title": article.title,
                    "views": typing_cast(Optional[int], getattr(article, "views", 0))
                    or 0,
                    "reading_time_minutes": _calculate_reading_time(
                        typing_cast(Optional[str], getattr(article, "content", ""))
                        or ""
                    ),
                    "published_at": article.published_at,
                }
                for article in top_articles
            ],
            "tag_distribution": [
                {"tag": tag, "count": count}
                for tag, count in tag_counter.most_common(12)
            ],
            "reading_time_distribution": [
                {"bucket": bucket, "count": reading_bucket_counter.get(bucket, 0)}
                for bucket in bucket_order
            ],
        }
    except Exception as e:
        logger.error(f"Error building news analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch news analytics")
