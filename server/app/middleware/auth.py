from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Set
from urllib.request import urlopen, Request
from urllib.error import URLError
import socket
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from jose.utils import base64url_decode
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.database import get_db_session_read
from ..models.user import Profile

logger = logging.getLogger(__name__)

security = HTTPBearer()

# ---------------------------------------------------------------------------
# Supabase JWT verification helpers
# ---------------------------------------------------------------------------
_JWKS_CACHE: Dict[str, Any] | None = None
_JWKS_CACHE_EXPIRES_AT: float = 0.0
_JWKS_CACHE_TTL_SECONDS = 3600


def _fetch_jwks() -> Dict[str, Any]:
    """Fetch JWKS from Supabase, caching the result for a short period."""
    global _JWKS_CACHE, _JWKS_CACHE_EXPIRES_AT

    now = time.time()
    if _JWKS_CACHE and now < _JWKS_CACHE_EXPIRES_AT:
        return _JWKS_CACHE

    if not settings.SUPABASE_JWKS_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWKS_URL is not configured",
        )

    # Retry logic with exponential backoff
    max_retries = 3
    base_delay = 0.5  # 500ms
    timeout = 5  # 5 seconds timeout per request

    last_exception = None
    for attempt in range(max_retries):
        try:
            # Set socket timeout for the request
            socket.setdefaulttimeout(timeout)
            request = Request(settings.SUPABASE_JWKS_URL)
            request.add_header("User-Agent", "FastAPI-Supabase-Auth/1.0")

            with urlopen(request, timeout=timeout) as response:
                jwks = json.loads(response.read().decode("utf-8"))

            # Success - cache and return
            _JWKS_CACHE = jwks
            _JWKS_CACHE_EXPIRES_AT = now + _JWKS_CACHE_TTL_SECONDS
            logger.debug("Successfully fetched Supabase JWKS (attempt %d)", attempt + 1)
            return jwks

        except (URLError, socket.timeout, socket.error) as exc:
            last_exception = exc
            if attempt < max_retries - 1:
                delay = base_delay * (2**attempt)  # Exponential backoff
                logger.warning(
                    "Failed to fetch Supabase JWKS (attempt %d/%d): %s. Retrying in %.2fs...",
                    attempt + 1,
                    max_retries,
                    exc,
                    delay,
                )
                time.sleep(delay)
            else:
                logger.error(
                    "Failed to fetch Supabase JWKS after %d attempts: %s",
                    max_retries,
                    exc,
                )
        except Exception as exc:
            # Non-retryable errors (e.g., JSON decode error)
            logger.error("Failed to fetch Supabase JWKS (non-retryable): %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Không thể tải khóa Supabase để xác thực token",
            ) from exc

    # All retries failed
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Không thể kết nối đến Supabase để xác thực token. Vui lòng thử lại sau.",
    ) from last_exception


def _get_signing_key(token: str) -> Dict[str, Any]:
    # Validate token format - JWT must have 3 parts separated by dots
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ: token rỗng hoặc không phải string",
        )

    token_parts = token.split(".")
    if len(token_parts) != 3:
        logger.warning(
            "Invalid token format: expected 3 parts (header.payload.signature), got %d parts. Token length: %d",
            len(token_parts),
            len(token),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ: định dạng JWT không đúng (phải có 3 phần)",
        )

    jwks = _fetch_jwks()
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")

    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Supabase thiếu kid",
        )

    keys = jwks.get("keys", [])
    for key in keys:
        if key.get("kid") == kid:
            return key

    # Nếu khóa không có trong cache, làm mới rồi thử lại một lần
    logger.info("Supabase JWKS cache miss for kid %s. Refreshing…", kid)
    global _JWKS_CACHE, _JWKS_CACHE_EXPIRES_AT
    _JWKS_CACHE = None
    _JWKS_CACHE_EXPIRES_AT = 0
    jwks = _fetch_jwks()
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không tìm thấy khóa ký Supabase phù hợp",
    )


def _decode_supabase_token(token: str) -> Dict[str, Any]:
    """Decode và verify Supabase JWT bằng JWKS."""
    signing_key = _get_signing_key(token)
    algorithm = signing_key.get("alg", "RS256")

    try:
        public_key = jwk.construct(signing_key)
        message, encoded_signature = token.rsplit(".", 1)
        decoded_signature = base64url_decode(encoded_signature.encode("utf-8"))
        if not public_key.verify(message.encode("utf-8"), decoded_signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Chữ ký Supabase token không hợp lệ",
            )

        options = {"verify_aud": False}
        claims = jwt.decode(
            token,
            public_key.to_pem().decode("utf-8"),
            algorithms=[algorithm],
            options=options,
        )
        return claims
    except JWTError as exc:
        logger.warning("JWT decode error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Supabase không hợp lệ",
        ) from exc


def _extract_role(claims: Dict[str, Any]) -> str:
    """Lấy role từ app_metadata trong Supabase JWT."""
    app_metadata = claims.get("app_metadata") or {}

    role: Optional[str] = None
    if isinstance(app_metadata, dict):
        candidate = (
            app_metadata.get("user_role")
            or app_metadata.get("role")
            or claims.get("user_role")
            or claims.get("role")
        )
        if isinstance(candidate, str):
            role = candidate
        elif isinstance(app_metadata.get("roles"), list):
            roles = app_metadata["roles"]
            if roles:
                role = str(roles[0])

    if not role:
        role = "student"

    return role.lower()


@dataclass
class AuthenticatedUser:
    """Ngữ cảnh người dùng đã xác thực dựa trên Supabase JWT."""

    user_id: UUID
    role: str
    email: Optional[str]
    claims: Dict[str, Any]


def get_current_user_claims(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    """Xác thực Supabase JWT và trả về claims đã chuẩn hóa."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu token Supabase",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Debug logging - log full token if it's suspiciously short
    if len(token) < 50:
        logger.warning(
            "Received suspiciously short token: length=%d, full_token=%s, parts=%d",
            len(token),
            repr(token),  # Use repr to show exact value including quotes/escapes
            len(token.split(".")),
        )
    else:
        # For normal tokens, only log preview for security
        token_preview = f"{token[:10]}...{token[-10:]}"
        logger.debug(
            "Received token: length=%d, preview=%s, parts=%d",
            len(token),
            token_preview,
            len(token.split(".")),
        )

    claims = _decode_supabase_token(token)

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase token thiếu sub",
        )

    try:
        user_uuid = UUID(str(sub))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase token chứa sub không hợp lệ",
        ) from exc

    role = _extract_role(claims)
    email = claims.get("email")

    logger.debug("Authenticated Supabase user %s with role %s", user_uuid, role)

    return AuthenticatedUser(
        user_id=user_uuid,
        role=role,
        email=email,
        claims=claims,
    )


def get_current_authenticated_user(
    auth_user: AuthenticatedUser = Depends(get_current_user_claims),
) -> AuthenticatedUser:
    """Trả về người dùng đã xác thực (mọi role)."""
    return auth_user


def _require_role(
    allowed_roles: Set[str],
    error_message: str,
):
    def dependency(
        auth_user: AuthenticatedUser = Depends(get_current_user_claims),
    ) -> AuthenticatedUser:
        if auth_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=error_message
            )
        return auth_user

    return dependency


get_current_supervisor_user = _require_role(
    {"admin", "supervisor"},
    "Chỉ admin hoặc giảng viên mới được truy cập",
)

get_current_admin_user = _require_role(
    {"admin"},
    "Chỉ admin mới được truy cập",
)


async def get_current_user_profile(
    auth_user: AuthenticatedUser = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_db_session_read),
) -> Profile:
    """Tải profile tương ứng với auth_user từ cơ sở dữ liệu."""
    profile = await db.get(Profile, auth_user.user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ người dùng không tồn tại",
        )
    return profile
