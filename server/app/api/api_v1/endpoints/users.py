from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from uuid import UUID

from ....core.database import get_db_session_read, get_db_session_write
from ....core.supabase_client import get_supabase_client
from ....models.user import Profile
from ....schemas.user import User as UserSchema, UserUpdate
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
    get_current_admin_user,
    get_current_user_profile,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _build_user_schema(
    auth_user: Any,
    profile: Optional[Profile],
    role: str,
) -> UserSchema:
    auth_user_id = getattr(auth_user, "id", None)
    if auth_user_id is None:
        auth_user_id = getattr(auth_user, "user_id", None)
    if auth_user_id is None and isinstance(auth_user, dict):
        auth_user_id = auth_user.get("id")
    if auth_user_id is None:
        raise ValueError("Auth user must have an id or user_id attribute")

    email = getattr(auth_user, "email", None)
    if email is None and isinstance(auth_user, dict):
        email = auth_user.get("email")

    user_metadata = getattr(auth_user, "user_metadata", None)
    if user_metadata is None and isinstance(auth_user, dict):
        user_metadata = auth_user.get("user_metadata")
    claims = getattr(auth_user, "claims", None)

    profile_full_name = (
        getattr(profile, "full_name", None) if profile is not None else None
    )
    profile_extra_raw = (
        getattr(profile, "extra_metadata", None) if profile is not None else None
    )
    profile_extra = profile_extra_raw if isinstance(profile_extra_raw, dict) else {}

    full_name = (
        profile_full_name
        or (user_metadata.get("full_name") if isinstance(user_metadata, dict) else None)
        or (email.split("@")[0] if email else "Chưa cập nhật")
    )

    username = getattr(profile, "username", None) if profile is not None else None
    if profile_extra:
        username = profile_extra.get("username")
    if not username and isinstance(user_metadata, dict):
        username = user_metadata.get("username")
    if not username and email:
        username = email.split("@")[0]
    if not username and profile is not None:
        username = str(getattr(profile, "id"))

    student_code = getattr(profile, "student_code", None) if profile else None
    if not student_code and profile_extra:
        student_code = profile_extra.get("student_code")

    is_superuser = role == "admin"
    is_instructor = role == "instructor"

    email_verified = bool(
        getattr(auth_user, "email_confirmed_at", None)
        or (isinstance(user_metadata, dict) and user_metadata.get("email_verified"))
    )
    if not email_verified and isinstance(claims, dict):
        email_verified = bool(
            claims.get("email_confirmed_at")
            or claims.get("email_confirmed")
            or claims.get("email_verified")
        )

    avatar_url = getattr(profile, "avatar_url", None) if profile is not None else None
    if avatar_url is None and isinstance(user_metadata, dict):
        avatar_url = user_metadata.get("avatar_url")

    created_at = getattr(auth_user, "created_at", None)
    if created_at is None and isinstance(auth_user, dict):
        created_at = auth_user.get("created_at")
    if created_at is None and profile is not None:
        created_at = getattr(profile, "created_at", None)

    updated_at = getattr(profile, "updated_at", None)
    if updated_at is None and isinstance(auth_user, dict):
        updated_at = auth_user.get("updated_at")

    return UserSchema.model_validate(
        {
            "id": UUID(str(auth_user_id)),
            "email": email or "",
            "username": username or "",
            "full_name": full_name or "",
            "is_active": True,
            "is_superuser": is_superuser,
            "is_instructor": is_instructor,
            "email_verified": email_verified,
            "avatar_url": avatar_url,
            "bio": profile.bio if profile else None,
            "student_code": student_code,
            "roles": [role],
            "created_at": created_at,
            "updated_at": updated_at,
        }
    )


# CRITICAL: Route "/me" MUST be defined BEFORE "/{user_id}" to avoid route conflicts
@router.get("/me", response_model=UserSchema)
def read_current_user(
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    profile: Profile = Depends(get_current_user_profile),
) -> Any:
    try:
        return _build_user_schema(
            auth_user=current_user,
            profile=profile,
            role=current_user.role,
        )
    except Exception as exc:
        logger.error("Error in /me endpoint: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user data",
        ) from exc


@router.patch("/me", response_model=UserSchema)
async def update_current_user(
    user_update: UserUpdate,
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    profile: Profile = Depends(get_current_user_profile),
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    """Update current user's profile"""
    try:
        update_data = user_update.dict(exclude_unset=True)

        # Remove fields that shouldn't be updated via this endpoint
        update_data.pop("email", None)  # Email is managed by Supabase Auth
        update_data.pop("is_active", None)  # Managed by admin
        update_data.pop("is_instructor", None)  # Managed by admin
        update_data.pop("password", None)  # Password change should be separate endpoint

        if not update_data:
            # No fields to update, return current profile
            return _build_user_schema(
                auth_user=current_user,
                profile=profile,
                role=current_user.role,
            )

        # Update profile fields
        for field, value in update_data.items():
            if hasattr(profile, field):
                setattr(profile, field, value)

        await db.commit()
        await db.refresh(profile)

        logger.info(f"Profile updated for user {current_user.user_id}")

        return _build_user_schema(
            auth_user=current_user,
            profile=profile,
            role=current_user.role,
        )
    except Exception as exc:
        logger.error("Error updating profile: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        ) from exc


@router.get("/", response_model=List[UserSchema])
async def read_users(
    skip: int = 0,
    limit: int = 50,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
) -> Any:
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

    results: List[UserSchema] = []
    for auth_user in users_data:
        user_id_value = getattr(auth_user, "id", None) or auth_user.get("id")
        if not user_id_value:
            continue

        user_uuid = UUID(str(user_id_value))
        profile = await db.get(Profile, user_uuid)
        app_metadata = getattr(auth_user, "app_metadata", None) or getattr(
            auth_user, "app_metadata", {}
        )
        role = str(app_metadata.get("user_role", "student")).lower()
        results.append(
            _build_user_schema(
                auth_user=auth_user,
                profile=profile,
                role=role,
            )
        )

    return results


@router.get("/{user_id}", response_model=UserSchema)
async def read_user_by_id(
    user_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db_session_read),
) -> Any:
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client is not configured",
        )

    try:
        auth_user = supabase.auth.admin.get_user_by_id(str(user_id))
    except Exception as exc:
        logger.error("Error fetching user %s from Supabase: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The user with this id does not exist in the system",
        ) from exc

    profile = await db.get(Profile, user_id)
    app_metadata = getattr(auth_user, "app_metadata", None) or getattr(
        auth_user, "app_metadata", {}
    )
    role = str(app_metadata.get("user_role", "student")).lower()

    return _build_user_schema(
        auth_user=auth_user,
        profile=profile,
        role=role,
    )


@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
) -> Any:
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Updating users is managed via Supabase Dashboard",
    )


@router.patch("/{user_id}", response_model=UserSchema)
def patch_user(
    user_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
) -> Any:
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Updating users is managed via Supabase Dashboard",
    )


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_admin_user),
) -> Any:
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Deleting users is managed via Supabase Dashboard",
    )
