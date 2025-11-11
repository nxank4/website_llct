from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Optional
import logging
from ..core.config import settings
from ..core.database import get_db
from ..models.user import User
from ..models.organization import UserRoleAssignment, UserRole

logger = logging.getLogger(__name__)

security = HTTPBearer()


class AuthMiddleware:
    def __init__(self):
        # Supabase has migrated from Legacy JWT Secret to new JWT Signing Keys
        # For token creation, we still need a secret key (use SECRET_KEY for backward compatibility)
        # Note: This is only used for creating tokens, not for verifying Supabase tokens
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM

        if not self.secret_key:
            logger.warning(
                "SECRET_KEY not configured. This is used for creating backend JWT tokens."
            )
        else:
            logger.info(
                f"Backend JWT signing key configured (first 10 chars): {self.secret_key[:10]}********"
            )

    def create_access_token(
        self, user_id: int, expires_delta: Optional[int] = None
    ) -> str:
        """Create JWT access token"""
        from datetime import datetime, timedelta

        if expires_delta:
            expire = datetime.utcnow() + timedelta(minutes=expires_delta)
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )

        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access",
        }

        if not self.secret_key:
            raise RuntimeError(
                "SECRET_KEY is not configured. Cannot create access token."
            )

        token = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        logger.debug(
            "Created access token for user_id %s using signing key (first 10 chars): %s...",
            user_id,
            self.secret_key[:10],
        )
        return token

    def create_refresh_token(self, user_id: int) -> str:
        """Create JWT refresh token"""
        from datetime import datetime, timedelta

        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh",
        }

        if not self.secret_key:
            raise RuntimeError(
                "SECRET_KEY is not configured. Cannot create refresh token."
            )

        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str, allow_refresh: bool = False) -> Optional[str]:
        """Verify JWT token and return user ID as string

        Args:
            token: JWT token to verify (backend JWT token, not Supabase token)
            allow_refresh: If True, also accept refresh tokens (type="refresh")
        
        Note: This verifies backend JWT tokens (signed with SECRET_KEY), not Supabase tokens.
        Supabase tokens are verified by ai-server using JWKS.
        """
        try:
            # Log token info for debugging (first 20 chars only for security)
            logger.debug(f"Verifying token (first 20 chars): {token[:20]}...")
            logger.debug("Algorithm: %s", self.algorithm)

            if not self.secret_key:
                raise JWTError("SECRET_KEY is not configured. Cannot verify token.")

            try:
                logger.debug(
                    "Attempting verification with signing key (first 10 chars): %s...",
                    self.secret_key[:10],
                )
                payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
                user_id = payload.get("sub")
                token_type = payload.get("type")

                if user_id and (
                    token_type == "access"
                    or token_type is None
                    or (allow_refresh and token_type == "refresh")
                ):
                    logger.debug(
                        "Token verified successfully for user_id: %s, type: %s",
                        user_id,
                        token_type,
                    )
                    return str(user_id)

                logger.warning(
                    "Token verification failed: invalid token type (%s) or missing user_id",
                    token_type,
                )
                return None
            except JWTError as e:
                logger.warning(f"Token verification failed: {e}")
                raise
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            logger.debug(f"Token (first 50 chars): {token[:50]}...")
            return None

    def get_current_user(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db),
    ) -> User:
        """Get current authenticated user"""
        token = credentials.credentials
        user_id = self.verify_token(token)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Try to convert user_id to int if User.id is integer, otherwise use as string
        try:
            user_id_int = int(user_id)
            user = db.query(User).filter(User.id == user_id_int).first()
        except ValueError:
            # If user_id is UUID string, query as string
            user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
            )

        return user

    def get_user_id_from_token(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> str:
        """Get user ID from JWT token without querying database"""
        token = credentials.credentials
        user_id = self.verify_token(token)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user_id

    def get_current_active_user(
        self, current_user: User = Depends(get_current_user)
    ) -> User:
        """Get current active user"""
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
            )
        return current_user

    def get_current_superuser(
        self, current_user: User = Depends(get_current_user)
    ) -> User:
        """Get current superuser"""
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )
        return current_user

    def get_current_admin_user(
        self, current_user: User = Depends(get_current_user)
    ) -> User:
        """Get current admin user (superuser only for role management)"""
        # Only superuser can manage roles
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin or superuser access required",
            )
        return current_user

    def check_user_role(
        self,
        user: User,
        required_role: UserRole,
        domain_id: Optional[int] = None,
        class_id: Optional[int] = None,
        db: Session = Depends(get_db),
    ) -> bool:
        """Check if user has required role in specific domain/class"""
        query = db.query(UserRoleAssignment).filter(
            UserRoleAssignment.user_id == user.id,
            UserRoleAssignment.role == required_role,
            UserRoleAssignment.is_active == True,
        )

        if domain_id:
            query = query.filter(UserRoleAssignment.domain_id == domain_id)

        if class_id:
            query = query.filter(UserRoleAssignment.class_id == class_id)

        return query.first() is not None

    def require_role(
        self,
        required_role: UserRole,
        domain_id: Optional[int] = None,
        class_id: Optional[int] = None,
    ):
        """Decorator to require specific role"""

        def role_checker(
            current_user: User = Depends(self.get_current_user),
            db: Session = Depends(get_db),
        ) -> User:
            # Superuser has all permissions
            if current_user.is_superuser:
                return current_user

            # Check specific role
            if not self.check_user_role(
                current_user, required_role, domain_id, class_id, db
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Required role: {required_role.value}",
                )

            return current_user

        return role_checker

    def require_instructor(
        self, domain_id: Optional[int] = None, class_id: Optional[int] = None
    ):
        """Require instructor role"""
        return self.require_role(UserRole.INSTRUCTOR, domain_id, class_id)

    def require_admin(self, domain_id: Optional[int] = None):
        """Require admin role"""
        return self.require_role(UserRole.ADMIN, domain_id)

    def require_student(self, class_id: Optional[int] = None):
        """Require student role"""
        return self.require_role(UserRole.STUDENT, class_id=class_id)


# Global auth instance
auth_middleware = AuthMiddleware()


# Common dependencies
# Wrap methods in functions to avoid FastAPI parsing 'self' as query parameter
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user"""
    return auth_middleware.get_current_user(credentials, db)


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    return auth_middleware.get_current_active_user(current_user)


def get_current_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Get current superuser"""
    return auth_middleware.get_current_superuser(current_user)


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current admin user (superuser only for role management)"""
    return auth_middleware.get_current_admin_user(current_user)


require_instructor = auth_middleware.require_instructor
require_admin = auth_middleware.require_admin
require_student = auth_middleware.require_student
