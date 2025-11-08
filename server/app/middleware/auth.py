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
        # Ưu tiên dùng Supabase JWT secret để xác thực token từ NextAuth client
        # Fallback về SECRET_KEY nếu SUPABASE_JWT_SECRET không được set
        self.secret_key = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM

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

        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

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

        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str) -> Optional[str]:
        """Verify JWT token and return user ID as string"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id = payload.get("sub")
            token_type = payload.get("type")

            # Nếu là Supabase JWT sẽ không có field 'type'. Chấp nhận khi có 'sub'.
            if user_id and (token_type == "access" or token_type is None):
                # Return as string to support both UUID and integer IDs
                return str(user_id)
            return None

        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
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
get_current_user = auth_middleware.get_current_user
get_current_active_user = auth_middleware.get_current_active_user
get_current_superuser = auth_middleware.get_current_superuser
require_instructor = auth_middleware.require_instructor
require_admin = auth_middleware.require_admin
require_student = auth_middleware.require_student
