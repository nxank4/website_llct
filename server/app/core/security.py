from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt
from jose.exceptions import JWTError
from passlib.context import CryptContext
import logging
from .config import settings

logger = logging.getLogger(__name__)

# Use pbkdf2_sha256 with lower rounds for better performance
# Default rounds is 29000, but we can reduce to 20000 for faster hashing
# Still secure enough for most use cases
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    pbkdf2_sha256__default_rounds=20000,  # Reduced from default 29000 for faster hashing
    deprecated="auto",
)


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any]) -> str:
    """Create a long-lived refresh token."""
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    import time

    start_time = time.time()
    hashed = pwd_context.hash(password)
    elapsed = time.time() - start_time
    logger.info(f"Password hashing took {elapsed:.3f} seconds")
    return hashed


def verify_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        raise ValueError("Invalid token")
