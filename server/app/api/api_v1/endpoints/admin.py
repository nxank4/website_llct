"""
Admin API endpoints for user role management
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from starlette import status
from typing import Any, Dict, List, Optional, cast
import logging
import json
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timezone

from ....models.user import Profile
from ....models.assessment import Assessment
from ....models.assessment_result import AssessmentResult
from ....schemas.admin import (
    RoleUpdateRequest,
    UserListResponse,
)
from ....core.database import get_db_session_read
from ....core.supabase_client import get_supabase_client
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_admin_user,
)
from ....middleware.rate_limiter import clear_rate_limit_store
from ....utils.auth_metadata import (
    ALLOWED_ROLES,
    determine_email_verified,
    normalize_user_role,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _json_or_dict(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            logger.warning("Không thể parse JSON metadata: %s", value)
    return {}


def _parse_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            normalized = value.replace("Z", "+00:00") if value.endswith("Z") else value
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None
    return None


def _get_material_status(metadata: Optional[dict]) -> tuple[str, str]:
    if not isinstance(metadata, dict):
        return "PENDING", "Chưa xử lý"

    raw_status = str(metadata.get("file_search_status", "PENDING")).upper()
    status_map = {
        "PENDING": "Chưa xử lý",
        "INDEXING": "Đang xử lý",
        "COMPLETED": "Đã xử lý",
        "FAILED": "Thất bại",
    }
    return raw_status, status_map.get(raw_status, "Chưa xử lý")


def _normalize_role_param(role: Optional[str]) -> Optional[str]:
    if not role:
        return None

    cleaned = role.strip().lower()
    allowed_values = set(ALLOWED_ROLES) | {"supervisor"}
    if cleaned not in allowed_values:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vai trò không hợp lệ. Chỉ chấp nhận admin, instructor hoặc student.",
        )
    return normalize_user_role(cleaned)


@router.post(
    "/users/{user_id}/set-role",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin_user)],
)
def set_user_role(
    user_id: UUID,
    request: RoleUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    API Endpoint CHỈ DÀNH CHO ADMIN để gán vai trò.

    Args:
        user_id: ID của user cần gán role
        request: RoleUpdateRequest với role cần gán
        db: Database session
        current_user: Current admin user (from dependency)

    Returns:
        204 No Content on success
    """
    # Validate role
    valid_roles = ["admin", "instructor", "student"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vai trò không hợp lệ. Vai trò hợp lệ: {', '.join(valid_roles)}",
        )

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client is not configured",
        )

    user_id_str = str(user_id)

    try:
        supabase.auth.admin.get_user_by_id(user_id_str)
    except Exception as exc:
        logger.error("Error fetching user %s from Supabase: %s", user_id_str, exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in Supabase",
        ) from exc

    target_role = request.role.value

    try:
        supabase.auth.admin.update_user_by_id(
            user_id_str,
            attributes={
                "app_metadata": {"user_role": target_role},
            },
        )
        logger.info(
            "User %s role updated to '%s' by admin %s",
            user_id_str,
            target_role,
            current_user.user_id,
        )
    except Exception as exc:
        logger.error("Error updating user role in Supabase: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật vai trò trên Supabase",
        ) from exc

    return None


async def _fetch_users_from_supabase(
    *,
    supabase_client,
    db: AsyncSession,
    skip: int,
    limit: int,
    search: Optional[str],
    role_filter: Optional[str],
    status_filter: Optional[str],
    sortBy: Optional[str],
    order: Optional[str],
    current_user: AuthenticatedUser,
) -> List[UserListResponse]:
    per_page = limit
    page = max((skip // max(per_page, 1)) + 1, 1)

    supabase_users = supabase_client.auth.admin.list_users(
        page=page,
        per_page=per_page,
    )

    # Debug: Log response structure
    logger.debug(
        "Supabase list_users response type: %s, hasattr users: %s, is dict: %s",
        type(supabase_users),
        hasattr(supabase_users, "users"),
        isinstance(supabase_users, dict),
    )

    users_data = getattr(supabase_users, "users", None)
    if users_data is None and isinstance(supabase_users, dict):
        users_data = supabase_users.get("users", [])
    users_data = users_data or []

    logger.info(
        "Supabase Admin API returned %s users (page=%s, per_page=%s)",
        len(users_data),
        page,
        per_page,
    )

    # If no users from Supabase, return empty list to trigger fallback
    if not users_data:
        logger.warning(
            "No users returned from Supabase Admin API. This will trigger database fallback."
        )
        return []

    search_lower = search.lower() if search else None
    responses: List[UserListResponse] = []

    for auth_user in users_data:
        auth_user_id = getattr(auth_user, "id", None) or auth_user.get("id")
        if not auth_user_id:
            continue

        user_uuid = UUID(str(auth_user_id))

        profile: Optional[Profile] = await db.get(Profile, user_uuid)
        profile_full_name = (
            cast(Optional[str], getattr(profile, "full_name", None))
            if profile
            else None
        )
        profile_avatar = (
            cast(Optional[str], getattr(profile, "avatar_url", None))
            if profile
            else None
        )
        profile_extra_raw = (
            getattr(profile, "extra_metadata", None) if profile else None
        )
        profile_extra: Dict[str, Any] = (
            profile_extra_raw if isinstance(profile_extra_raw, dict) else {}
        )

        email = getattr(auth_user, "email", None) or auth_user.get("email")
        user_metadata = getattr(auth_user, "user_metadata", None) or getattr(
            auth_user, "user_metadata", {}
        )
        app_metadata = getattr(auth_user, "app_metadata", None) or getattr(
            auth_user, "app_metadata", {}
        )

        full_name = (
            profile_full_name
            or (
                user_metadata.get("full_name")
                if isinstance(user_metadata, dict)
                else None
            )
            or (email.split("@")[0] if email else "Chưa cập nhật")
        )

        username = None
        if profile_extra:
            username = cast(Optional[str], profile_extra.get("username"))
        if not username and isinstance(user_metadata, dict):
            username = cast(Optional[str], user_metadata.get("username"))
        if not username and email:
            username = email.split("@")[0]
        if not username:
            username = str(user_uuid)

        if search_lower:
            haystack = " ".join(
                filter(
                    None,
                    [
                        email.lower() if email else "",
                        full_name.lower() if full_name else "",
                        username.lower() if username else "",
                    ],
                )
            )
            if search_lower not in haystack:
                continue

        raw_role = (
            app_metadata.get("user_role") if isinstance(app_metadata, dict) else None
        )
        user_role = normalize_user_role(raw_role)

        # Apply role filter
        if role_filter and user_role != role_filter:
            continue

        is_superuser = user_role == "admin"
        is_instructor = user_role == "instructor"

        banned_until = getattr(auth_user, "banned_until", None)
        is_active = banned_until in (None, "", 0)

        # Apply status filter
        if status_filter:
            status_lower = status_filter.lower()
            if status_lower == "active" and not is_active:
                continue
            elif status_lower == "inactive" and is_active:
                continue

        email_verified = determine_email_verified(auth_user)

        created_at = getattr(auth_user, "created_at", None) or getattr(
            auth_user, "created_at", None
        )

        total_assessments = 0
        total_results = 0

        if is_instructor or is_superuser:
            count_query = select(func.count(Assessment.id)).where(
                Assessment.created_by == user_uuid
            )
            result_count = await db.execute(count_query)
            total_assessments = result_count.scalar() or 0

        if user_role == "student":
            count_query = select(func.count(AssessmentResult.id)).where(
                AssessmentResult.student_id == user_uuid
            )
            result_count = await db.execute(count_query)
            total_results = result_count.scalar() or 0

        avatar_url = profile_avatar
        if avatar_url is None and isinstance(user_metadata, dict):
            avatar_url = cast(Optional[str], user_metadata.get("avatar_url"))

        response = UserListResponse.model_validate(
            {
                "id": user_uuid,
                "email": email or "",
                "username": username,
                "full_name": full_name or "",
                "is_active": bool(is_active),
                "is_superuser": is_superuser,
                "is_instructor": is_instructor,
                "email_verified": email_verified,
                "avatar_url": avatar_url,
                "created_at": created_at,
                "role": user_role,
                "total_assessments": total_assessments,
                "total_results": total_results,
            }
        )
        responses.append(response)

    # Apply sorting
    if sortBy:
        sort_field = sortBy.lower()
        reverse_order = bool(order and order.lower() == "desc")

        if sort_field == "email":
            responses.sort(key=lambda x: (x.email or "").lower(), reverse=reverse_order)
        elif sort_field == "full_name":
            responses.sort(
                key=lambda x: (x.full_name or "").lower(), reverse=reverse_order
            )
        elif sort_field == "role":
            responses.sort(key=lambda x: x.role or "", reverse=reverse_order)
        elif sort_field == "created_at":
            responses.sort(
                key=lambda x: x.created_at if x.created_at else datetime.min,
                reverse=reverse_order,
            )

    logger.info(
        "Retrieved %s users from Supabase for admin %s (filters: role=%s, status=%s, sortBy=%s, order=%s)",
        len(responses),
        current_user.user_id,
        role_filter,
        status_filter,
        sortBy,
        order,
    )
    return responses


async def _fetch_users_from_database(
    *,
    db: AsyncSession,
    skip: int,
    limit: int,
    search: Optional[str],
    role_filter: Optional[str],
    status_filter: Optional[str],
    sortBy: Optional[str],
    order: Optional[str],
) -> List[UserListResponse]:
    params: Dict[str, Any] = {"limit": limit, "offset": skip}
    conditions: List[str] = []

    if search:
        params["search"] = f"%{search.strip()}%"
        conditions.append(
            """
            (
                u.email ILIKE :search
                OR COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) ILIKE :search
                OR COALESCE(p.extra_metadata->>'username', u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) ILIKE :search
            )
            """
        )

    if role_filter:
        params["role_filter"] = role_filter
        conditions.append(
            "LOWER(COALESCE(u.raw_app_meta_data->>'user_role', 'student')) = :role_filter"
        )

    if status_filter:
        status_lower = status_filter.lower()
        if status_lower == "active":
            conditions.append("(u.banned_until IS NULL OR u.banned_until <= NOW())")
        elif status_lower == "inactive":
            conditions.append("(u.banned_until IS NOT NULL AND u.banned_until > NOW())")

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(
            f"({cond.strip()})" for cond in conditions
        )

    sort_field_map = {
        "email": "u.email",
        "full_name": "COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))",
        "role": "COALESCE(LOWER(u.raw_app_meta_data->>'user_role'), 'student')",
        "created_at": "u.created_at",
    }

    if sortBy:
        sort_key = sort_field_map.get(sortBy.lower(), "u.created_at")
        sort_direction = "DESC" if order and order.lower() == "desc" else "ASC"
    else:
        sort_key = "u.created_at"
        sort_direction = "DESC"

    query = text(
        f"""
        SELECT
            u.id,
            u.email,
            u.raw_user_meta_data,
            u.raw_app_meta_data,
            u.created_at,
            u.email_confirmed_at,
            u.banned_until,
            p.full_name AS profile_full_name,
            p.avatar_url AS profile_avatar_url,
            p.extra_metadata AS profile_extra_metadata
        FROM auth.users AS u
        LEFT JOIN public.profiles AS p ON p.id = u.id
        {where_clause}
        ORDER BY {sort_key} {sort_direction}
        LIMIT :limit OFFSET :offset
        """
    )

    try:
        result = await db.execute(query, params)
    except Exception as exc:
        logger.error("Fallback query for users failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users from database",
        ) from exc

    rows = result.mappings().all()
    entries: List[Dict[str, Any]] = []
    instructor_ids: set[UUID] = set()
    student_ids: set[UUID] = set()

    now_utc = datetime.now(timezone.utc)

    for row in rows:
        user_id_value = row.get("id")
        if not user_id_value:
            continue

        user_uuid = UUID(str(user_id_value))
        email = row.get("email") or ""
        user_metadata = _json_or_dict(row.get("raw_user_meta_data"))
        app_metadata = _json_or_dict(row.get("raw_app_meta_data"))
        profile_extra = _json_or_dict(row.get("profile_extra_metadata"))

        profile_full_name = row.get("profile_full_name")
        profile_avatar = row.get("profile_avatar_url")

        full_name = (
            profile_full_name
            or user_metadata.get("full_name")
            or (email.split("@")[0] if email else "Chưa cập nhật")
        )

        username = (
            profile_extra.get("username")
            or user_metadata.get("username")
            or (email.split("@")[0] if email else str(user_uuid))
        )

        avatar_url = profile_avatar or user_metadata.get("avatar_url")

        user_role = normalize_user_role(app_metadata.get("user_role"))

        banned_until_value = _parse_datetime(row.get("banned_until"))
        is_active = True
        if banned_until_value:
            is_active = banned_until_value <= now_utc

        email_confirmed_at = _parse_datetime(row.get("email_confirmed_at"))

        created_at = _parse_datetime(row.get("created_at"))

        synthetic_user = {
            "email_confirmed_at": email_confirmed_at,
            "user_metadata": user_metadata,
            "app_metadata": app_metadata,
        }
        email_verified = determine_email_verified(synthetic_user)

        entry = {
            "id": user_uuid,
            "email": email,
            "username": username,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "role": user_role,
            "is_active": is_active,
            "is_superuser": user_role == "admin",
            "is_instructor": user_role == "instructor",
            "email_verified": email_verified,
            "created_at": created_at,
        }

        if user_role in {"admin", "instructor"}:
            instructor_ids.add(user_uuid)
        if user_role == "student":
            student_ids.add(user_uuid)

        entries.append(entry)

    assessment_counts: Dict[UUID, int] = {}
    if instructor_ids:
        assessment_query = (
            select(Assessment.created_by, func.count(Assessment.id))
            .where(Assessment.created_by.in_(list(instructor_ids)))
            .group_by(Assessment.created_by)
        )
        assessment_result = await db.execute(assessment_query)
        for creator_id, count in assessment_result.all():
            assessment_counts[creator_id] = int(count or 0)

    result_counts: Dict[UUID, int] = {}
    if student_ids:
        result_query = (
            select(AssessmentResult.student_id, func.count(AssessmentResult.id))
            .where(AssessmentResult.student_id.in_(list(student_ids)))
            .group_by(AssessmentResult.student_id)
        )
        student_result = await db.execute(result_query)
        for student_id, count in student_result.all():
            result_counts[student_id] = int(count or 0)

    responses: List[UserListResponse] = []
    for entry in entries:
        user_uuid: UUID = entry["id"]
        responses.append(
            UserListResponse.model_validate(
                {
                    "id": user_uuid,
                    "email": entry["email"],
                    "username": entry["username"],
                    "full_name": entry["full_name"],
                    "is_active": entry["is_active"],
                    "is_superuser": entry["is_superuser"],
                    "is_instructor": entry["is_instructor"],
                    "email_verified": entry["email_verified"],
                    "avatar_url": entry["avatar_url"],
                    "created_at": entry["created_at"],
                    "role": entry["role"],
                    "total_assessments": assessment_counts.get(user_uuid, 0),
                    "total_results": result_counts.get(user_uuid, 0),
                }
            )
        )

    logger.info(
        "Retrieved %s users via database fallback (filters: role=%s, status=%s, sortBy=%s, order=%s)",
        len(responses),
        role_filter,
        status_filter,
        sortBy,
        order,
    )
    return responses


@router.get(
    "/users",
    response_model=List[UserListResponse],
    dependencies=[Depends(get_current_admin_user)],
)
async def list_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of users to return"),
    search: Optional[str] = Query(
        None, description="Search by email, username, or full_name"
    ),
    role: Optional[str] = Query(
        None, description="Filter by role: admin, instructor, student"
    ),
    status: Optional[str] = Query(
        None, description="Filter by status: active, inactive"
    ),
    sortBy: Optional[str] = Query(
        None, description="Sort by field: email, full_name, role, created_at"
    ),
    order: Optional[str] = Query("asc", description="Sort order: asc, desc"),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get list of users (Admin only) with fallback to direct database query
    when Supabase Admin API is unavailable.
    """
    supabase = get_supabase_client()
    role_filter = _normalize_role_param(role)

    if supabase:
        try:
            supabase_result = await _fetch_users_from_supabase(
                supabase_client=supabase,
                db=db,
                skip=skip,
                limit=limit,
                search=search,
                role_filter=role_filter,
                status_filter=status,
                sortBy=sortBy,
                order=order,
                current_user=current_user,
            )
            # If Supabase returned users, use them; otherwise fallback to database
            if supabase_result:
                return supabase_result
            else:
                logger.info(
                    "Supabase Admin API returned 0 users. Falling back to database query."
                )
        except HTTPException as exc:
            logger.warning(
                "Supabase admin API failed with %s. Falling back to database query.",
                exc.detail,
            )
        except Exception as exc:
            logger.error("Supabase admin API error: %s. Falling back to database.", exc)

    logger.info("Using database fallback to list users (Supabase unavailable).")
    return await _fetch_users_from_database(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        role_filter=role_filter,
        status_filter=status,
        sortBy=sortBy,
        order=order,
    )


@router.post(
    "/rate-limit/clear",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_admin_user)],
)
def clear_rate_limit(
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
):
    """
    Clear rate limit store (Admin only)

    Args:
        current_user: Current admin user (from dependency)

    Returns:
        Success message
    """
    try:
        clear_rate_limit_store()
        logger.info("Rate limit store cleared by admin %s", current_user.user_id)
        return {"message": "Rate limit store cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing rate limit store: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear rate limit store",
        )


@router.get(
    "/subjects",
    response_model=List[dict],
    dependencies=[Depends(get_current_admin_user)],
)
async def list_subjects(
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get list of subjects from organization model - Admin only

    Returns:
        List of subjects with id and name
    """
    try:
        from ....models.library import LibrarySubject

        result = await db.execute(
            select(LibrarySubject).where(LibrarySubject.is_active.is_(True))
        )
        subjects = result.scalars().all()

        subjects_list = [
            {
                "id": subject.id,
                "name": subject.name,
                "description": subject.description,
            }
            for subject in subjects
        ]

        logger.info(
            "Retrieved %s subjects for admin %s",
            len(subjects_list),
            current_user.user_id,
        )
        return subjects_list

    except Exception as e:
        logger.error(f"Error listing subjects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subjects: {str(e)}",
        )


@router.get(
    "/dashboard/stats",
    dependencies=[Depends(get_current_admin_user)],
)
async def get_dashboard_stats(
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get comprehensive dashboard statistics - Admin only

    Returns:
        Dictionary with counts for subjects, lectures, news, and AI files
    """
    try:
        from ....models.library import LibrarySubject
        from ....models.content import Material
        from ....models.news import News, NewsStatus
        from ....models.gemini_file import GeminiFile

        # Count subjects (active only)
        subjects_query = select(func.count(LibrarySubject.id)).where(
            LibrarySubject.is_active.is_(True)
        )
        subjects_result = await db.execute(subjects_query)
        total_subjects = subjects_result.scalar() or 0

        # Count lectures (materials with uploaded_for='lecture')
        lectures_query = select(func.count(Material.id)).where(
            text("materials.file_metadata->>'uploaded_for' = 'lecture'")
        )
        lectures_result = await db.execute(lectures_query)
        total_lectures = lectures_result.scalar() or 0

        # Count news (published only)
        news_query = select(func.count(News.id)).where(
            News.status == NewsStatus.PUBLISHED
        )
        news_result = await db.execute(news_query)
        total_news = news_result.scalar() or 0

        # Count AI files (all statuses)
        ai_files_query = select(func.count(GeminiFile.id))
        ai_files_result = await db.execute(ai_files_query)
        total_ai_files = ai_files_result.scalar() or 0

        logger.info(
            "Retrieved dashboard stats for admin %s: subjects=%s, lectures=%s, news=%s, ai_files=%s",
            current_user.user_id,
            total_subjects,
            total_lectures,
            total_news,
            total_ai_files,
        )

        return {
            "total_subjects": total_subjects,
            "total_lectures": total_lectures,
            "total_news": total_news,
            "total_ai_files": total_ai_files,
        }

    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}",
        )
