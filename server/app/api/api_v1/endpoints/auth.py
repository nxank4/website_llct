from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging

from ....core import security
from ....core.config import settings
from ....core.database import get_db
from ....models.user import User
# Import all models to ensure relationships are properly initialized
from ....models import organization, content, course, chat, assessment, rag  # noqa: F401
from ....schemas.user import User as UserSchema, UserCreate, Token
from ....middleware.auth import auth_middleware

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Tài khoản đã bị vô hiệu hóa"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Use auth_middleware to create token to ensure consistency with verification
    # This ensures the same secret key is used for both creation and verification
    access_token = auth_middleware.create_access_token(
        user.id, expires_delta=int(access_token_expires.total_seconds() / 60)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user
    """
    import time
    start_time = time.time()
    
    logger.info(
        f"Register request received for email: {user_in.email}, username: {user_in.username}"
    )
    logger.info(f"[{time.time() - start_time:.3f}s] Request started")

    try:
        # Check if user already exists by email
        logger.info("Checking if email already exists...")
        logger.info(f"[{time.time() - start_time:.3f}s] Starting email check query")
        query_start = time.time()
        user = db.query(User).filter(User.email == user_in.email).first()
        query_elapsed = time.time() - query_start
        logger.info(f"[{time.time() - start_time:.3f}s] Email check query completed in {query_elapsed:.3f}s")
        
        if user:
            logger.warning(f"Registration failed: Email {user_in.email} already exists")
            raise HTTPException(
                status_code=400,
                detail="Email này đã được sử dụng trong hệ thống. Vui lòng sử dụng email khác.",
            )

        # Check if user already exists by username
        logger.info("Checking if username already exists...")
        logger.info(f"[{time.time() - start_time:.3f}s] Starting username check query")
        query_start = time.time()
        user = db.query(User).filter(User.username == user_in.username).first()
        query_elapsed = time.time() - query_start
        logger.info(f"[{time.time() - start_time:.3f}s] Username check query completed in {query_elapsed:.3f}s")
        
        if user:
            logger.warning(
                f"Registration failed: Username {user_in.username} already exists"
            )
            raise HTTPException(
                status_code=400,
                detail="Tên người dùng này đã được sử dụng trong hệ thống. Vui lòng chọn tên khác.",
            )

        # Hash password
        logger.info("Hashing password...")
        logger.info(f"[{time.time() - start_time:.3f}s] Starting password hash")
        hash_start = time.time()
        hashed_password = security.get_password_hash(user_in.password)
        hash_elapsed = time.time() - hash_start
        logger.info(f"[{time.time() - start_time:.3f}s] Password hashed successfully in {hash_elapsed:.3f}s")

        # Create new user
        logger.info("Creating user object...")
        logger.info(f"[{time.time() - start_time:.3f}s] Creating user object")
        user = User(
            email=user_in.email,
            username=user_in.username,
            full_name=user_in.full_name,
            hashed_password=hashed_password,
            is_active=user_in.is_active,
            is_instructor=user_in.is_instructor,
            avatar_url=user_in.avatar_url,
            bio=user_in.bio,
        )

        logger.info("Adding user to database session...")
        logger.info(f"[{time.time() - start_time:.3f}s] Adding user to session")
        db.add(user)

        logger.info("Committing to database...")
        logger.info(f"[{time.time() - start_time:.3f}s] Starting database commit")
        commit_start = time.time()
        db.commit()
        commit_elapsed = time.time() - commit_start
        logger.info(f"[{time.time() - start_time:.3f}s] Database commit completed in {commit_elapsed:.3f}s")

        logger.info("Refreshing user object...")
        logger.info(f"[{time.time() - start_time:.3f}s] Refreshing user object")
        refresh_start = time.time()
        db.refresh(user)
        refresh_elapsed = time.time() - refresh_start
        logger.info(f"[{time.time() - start_time:.3f}s] User object refreshed in {refresh_elapsed:.3f}s")

        total_elapsed = time.time() - start_time
        logger.info(f"User registered successfully: {user_in.email} (ID: {user.id})")
        logger.info(f"[{total_elapsed:.3f}s] Total registration time")
        return user

    except HTTPException:
        elapsed = time.time() - start_time
        logger.warning(f"[{elapsed:.3f}s] Registration failed with HTTPException")
        raise
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"[{elapsed:.3f}s] Error registering user: {e}", exc_info=True)
        db.rollback()
        
        # Provide more specific error message in development
        from ...core.config import settings
        error_detail = "Đăng ký thất bại. Vui lòng thử lại sau."
        
        # In development, include more details
        if settings.ENVIRONMENT == "development":
            error_detail = f"Đăng ký thất bại: {str(e)}. Vui lòng kiểm tra server logs để biết thêm chi tiết."
        
        raise HTTPException(
            status_code=500,
            detail=error_detail,
        )
