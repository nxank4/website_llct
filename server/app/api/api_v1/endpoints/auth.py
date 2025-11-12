from typing import Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Body
from pydantic import BaseModel, EmailStr
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from ....schemas.user import Token
from ....core.database import get_db_session_write
from ....core.supabase_client import get_supabase_client
from ....models.user import Profile
from ....middleware.auth import (
    AuthenticatedUser,
    get_current_authenticated_user,
)

logger = logging.getLogger(__name__)
router = APIRouter()

AUTH_MESSAGE = "Authentication is handled by Supabase. Please use Supabase Auth flows."


class GoogleOAuthRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


@router.post("/login", response_model=Token)
def login_access_token() -> Any:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=AUTH_MESSAGE,
    )


@router.post("/register", response_model=Token)
def register_user() -> Any:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=AUTH_MESSAGE,
    )


@router.post("/recover-password")
def recover_password() -> Any:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=AUTH_MESSAGE,
    )


@router.post("/reset-password")
def reset_password() -> Any:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=AUTH_MESSAGE,
    )


@router.post("/logout")
def logout_access_token(
    current_user: AuthenticatedUser = Depends(get_current_authenticated_user),
) -> Any:
    logger.info("Logout requested by user %s", current_user.user_id)
    return {
        "message": "Logout acknowledged. Supabase will handle token expiration automatically.",
    }


@router.post("/refresh", response_model=Token)
def refresh_access_token() -> Any:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=AUTH_MESSAGE,
    )


@router.post("/verify", response_model=Token)
def verify_token(token: str = Body(..., embed=True)) -> Any:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=AUTH_MESSAGE,
    )


@router.post("/oauth/google")
async def oauth_google(
    oauth_data: GoogleOAuthRequest,
    db: AsyncSession = Depends(get_db_session_write),
) -> Any:
    """
    Handle Google OAuth callback from frontend.

    This endpoint:
    1. Finds or creates a user in Supabase Auth by email
    2. Creates a Profile in the database if it doesn't exist
    3. Returns a success response (frontend will use NextAuth token)
    """
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client is not configured",
        )

    try:
        # Try to find user in Supabase Auth by email
        try:
            # List users and find by email
            users_response = supabase.auth.admin.list_users()
            users = getattr(users_response, "users", None) or []
            if isinstance(users_response, dict):
                users = users_response.get("users", [])

            auth_user = None
            for user in users:
                user_email = getattr(user, "email", None) or (
                    user.get("email") if isinstance(user, dict) else None
                )
                if user_email and user_email.lower() == oauth_data.email.lower():
                    auth_user = user
                    break

            if not auth_user:
                # User doesn't exist in Supabase Auth - create it
                logger.info(
                    "User with email %s not found in Supabase Auth. Creating new user...",
                    oauth_data.email,
                )
                try:
                    # Create user in Supabase Auth
                    create_response = supabase.auth.admin.create_user(
                        {
                            "email": oauth_data.email,
                            "email_confirm": True,  # Auto-confirm email for OAuth users
                            "user_metadata": {
                                "full_name": oauth_data.full_name,
                                "provider": "google",
                            },
                        }
                    )

                    # Extract user from response
                    if isinstance(create_response, dict):
                        auth_user = create_response.get("user")
                    else:
                        auth_user = getattr(create_response, "user", None)

                    if not auth_user:
                        logger.error(
                            "Failed to create user in Supabase Auth: no user in response"
                        )
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create user in Supabase Auth",
                        )

                    logger.info(
                        "Successfully created user in Supabase Auth: %s",
                        oauth_data.email,
                    )
                except Exception as create_exc:
                    logger.error(
                        "Error creating user in Supabase Auth: %s",
                        create_exc,
                        exc_info=True,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to create user in Supabase Auth: {str(create_exc)}",
                    ) from create_exc

            # Get user ID
            user_id = getattr(auth_user, "id", None) or (
                auth_user.get("id") if isinstance(auth_user, dict) else None
            )
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to get user ID from Supabase Auth",
                )

            user_uuid = UUID(str(user_id))

            # Check if Profile exists, create if not
            profile = await db.get(Profile, user_uuid)
            if not profile:
                # Create Profile
                profile = Profile(
                    id=user_uuid,
                    email=oauth_data.email,
                    full_name=oauth_data.full_name,
                    username=oauth_data.email.split("@")[0],
                    is_active=True,
                )
                db.add(profile)
                await db.commit()
                await db.refresh(profile)
                logger.info(
                    f"Created Profile for user {user_uuid} ({oauth_data.email})"
                )
            else:
                # Update Profile if full_name is provided and different
                current_full_name = getattr(profile, "full_name", None) or ""
                if oauth_data.full_name and current_full_name != oauth_data.full_name:
                    setattr(profile, "full_name", oauth_data.full_name)  # type: ignore[arg-type]
                    await db.commit()
                    await db.refresh(profile)
                    logger.info(
                        f"Updated Profile for user {user_uuid} ({oauth_data.email})"
                    )

            # Return success response
            # Note: Supabase không có API trực tiếp để tạo session token từ user ID
            # Frontend sẽ cần tự tạo Supabase session hoặc dùng NextAuth session
            # NextAuth session đã có Supabase UUID trong token.sub
            return {
                "message": "OAuth Google callback processed successfully",
                "user_id": str(user_uuid),
                "email": oauth_data.email,
                "access_token": None,  # Không thể tạo Supabase JWT token server-side
                # Frontend cần lấy Supabase UUID từ NextAuth session và tự tạo session
            }

        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error processing Google OAuth callback: {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process OAuth callback: {str(exc)}",
            ) from exc

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error in Google OAuth endpoint: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        ) from exc
