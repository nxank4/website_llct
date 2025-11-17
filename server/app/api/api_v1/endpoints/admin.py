"""
Admin API endpoints for user role management
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from starlette import status
from typing import Any, Dict, List, Optional, cast
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from ....models.user import Profile
from ....models.assessment import Assessment
from ....models.assessment_result import AssessmentResult
from ....schemas.admin import (
    RoleUpdateRequest,
    UserListResponse,
)
from ....core.database import get_db_session_write, get_db_session_read
from ....core.supabase_client import get_supabase_client
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_admin_user,
    get_current_user_profile,
)
from ....middleware.rate_limiter import clear_rate_limit_store

logger = logging.getLogger(__name__)
router = APIRouter()


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

    try:
        supabase.auth.admin.update_user_by_id(
            user_id_str,
            attributes={
                "app_metadata": {"user_role": request.role},
            },
        )
        logger.info(
            "User %s role updated to '%s' by admin %s",
            user_id_str,
            request.role,
            current_user.user_id,
        )
    except Exception as exc:
        logger.error("Error updating user role in Supabase: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật vai trò trên Supabase",
        ) from exc

    return None


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
    order: Optional[str] = Query(
        "asc", description="Sort order: asc, desc"
    ),
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
):
    """
    Get list of users (Admin only)

    Args:
        skip: Number of users to skip
        limit: Number of users to return
        search: Search term for email, username, or full_name
        db: Database session
        current_user: Current admin user (from dependency)

    Returns:
        List of users
    """
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase client is not configured",
            )

        per_page = limit
        page = max((skip // max(per_page, 1)) + 1, 1)

        try:
            supabase_users = supabase.auth.admin.list_users(
                page=page,
                per_page=per_page,
            )
        except Exception as exc:
            logger.error("Error listing users from Supabase: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch users from Supabase",
            ) from exc

        users_data = getattr(supabase_users, "users", None)
        if users_data is None and isinstance(supabase_users, dict):
            users_data = supabase_users.get("users", [])
        users_data = users_data or []

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

            user_role = (
                app_metadata.get("user_role", "student")
                if isinstance(app_metadata, dict)
                else "student"
            )
            user_role = str(user_role).lower()

            # Apply role filter
            if role and user_role != role.lower():
                continue

            is_superuser = user_role == "admin"
            is_instructor = user_role == "instructor"

            is_active = getattr(auth_user, "banned_until", None) in (None, "", 0)
            
            # Apply status filter
            if status:
                status_lower = status.lower()
                if status_lower == "active" and not is_active:
                    continue
                elif status_lower == "inactive" and is_active:
                    continue
            email_verified = bool(
                getattr(auth_user, "email_confirmed_at", None)
                or (
                    isinstance(user_metadata, dict)
                    and user_metadata.get("email_verified")
                )
            )

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

            if role == "student":
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
            reverse_order = order and order.lower() == "desc"
            
            if sort_field == "email":
                responses.sort(key=lambda x: (x.email or "").lower(), reverse=reverse_order)
            elif sort_field == "full_name":
                responses.sort(key=lambda x: (x.full_name or "").lower(), reverse=reverse_order)
            elif sort_field == "role":
                responses.sort(key=lambda x: x.role or "", reverse=reverse_order)
            elif sort_field == "created_at":
                responses.sort(
                    key=lambda x: x.created_at if x.created_at else datetime.min,
                    reverse=reverse_order
                )

        logger.info(
            "Retrieved %s users from Supabase for admin %s (filters: role=%s, status=%s, sortBy=%s, order=%s)",
            len(responses),
            current_user.user_id,
            role,
            status,
            sortBy,
            order,
        )
        return responses

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error listing users: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users",
        ) from exc


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

        result = await db.execute(select(LibrarySubject).where(LibrarySubject.is_active.is_(True)))
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
