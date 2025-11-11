from datetime import timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging
from pydantic import EmailStr

from ....core import security
from ....core.config import settings
from ....core.database import get_db
from ....models.user import User

# Import all models to ensure relationships are properly initialized
from ....models import organization, content, course, chat, assessment, rag  # noqa: F401
from ....schemas.user import User as UserSchema, UserCreate, Token
from ....middleware.auth import auth_middleware, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    logger.info(f"Login attempt for email: {form_data.username}")
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        # User không tồn tại trong database, kiểm tra xem có trong Supabase Auth không
        # Nếu có, tự động tạo user trong database
        logger.info(
            f"User not found in database, checking Supabase Auth for: {form_data.username}"
        )

        # Kiểm tra cấu hình Supabase
        if settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY:
            try:
                from supabase import create_client, Client

                # Tạo Supabase client với secret key (service role)
                supabase: Client = create_client(
                    settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY
                )

                # Thử đăng nhập với Supabase Auth để verify password
                try:
                    auth_response = supabase.auth.sign_in_with_password(
                        {
                            "email": form_data.username,
                            "password": form_data.password,
                        }
                    )

                    if auth_response.user and auth_response.session:
                        # User tồn tại trong Supabase Auth và password đúng
                        logger.info(
                            f"User found in Supabase Auth, creating user in database: {form_data.username}"
                        )

                        # Lấy thông tin user từ Supabase Auth
                        supabase_user = auth_response.user
                        email = supabase_user.email
                        email_verified = supabase_user.email_confirmed_at is not None

                        # Tạo username từ email nếu không có
                        username = (
                            email.split("@")[0]
                            if email
                            else form_data.username.split("@")[0]
                        )
                        base_username = username
                        counter = 1
                        while db.query(User).filter(User.username == username).first():
                            username = f"{base_username}{counter}"
                            counter += 1

                        # Lấy full_name từ user_metadata nếu có
                        full_name = (
                            supabase_user.user_metadata.get("full_name")
                            or supabase_user.user_metadata.get("name")
                            or username
                        )

                        # Tạo user mới trong database
                        user = User(
                            email=email or form_data.username,
                            username=username,
                            full_name=full_name,
                            hashed_password=security.get_password_hash(
                                form_data.password
                            ),  # Hash password để lưu trong database
                            is_active=True,
                            is_superuser=False,
                            is_instructor=False,
                            email_verified=email_verified,
                            avatar_url=supabase_user.user_metadata.get("avatar_url"),
                            bio=supabase_user.user_metadata.get("bio"),
                        )

                        db.add(user)
                        db.commit()
                        db.refresh(user)

                        logger.info(
                            f"User created in database from Supabase Auth: {email} (ID: {user.id})"
                        )
                    else:
                        # User không tồn tại hoặc password sai
                        logger.warning(
                            f"Login failed: User with email {form_data.username} not found in Supabase Auth or password incorrect"
                        )
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Email hoặc mật khẩu không đúng",
                            headers={"WWW-Authenticate": "Bearer"},
                        )
                except Exception as supabase_error:
                    # Lỗi khi đăng nhập với Supabase (có thể là password sai, user không tồn tại, hoặc email chưa xác thực)
                    error_message = str(supabase_error)
                    logger.warning(f"Supabase Auth login failed: {error_message}")

                    # Kiểm tra xem lỗi có phải là "Email not confirmed" không
                    # Chuyển tất cả sang lowercase để so sánh
                    error_lower = error_message.lower()

                    # Kiểm tra nhiều cách để phát hiện lỗi email chưa xác thực
                    is_email_not_confirmed = (
                        "email not confirmed" in error_lower
                        or "email not verified" in error_lower
                        or "email confirmation required" in error_lower
                    )

                    if is_email_not_confirmed:
                        # Email chưa được xác thực
                        logger.warning(
                            f"Email not confirmed for user: {form_data.username}"
                        )
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Email chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản trước khi đăng nhập.",
                        )
                    else:
                        # Password sai hoặc user không tồn tại
                        logger.warning(
                            f"Invalid credentials for user: {form_data.username}"
                        )
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Email hoặc mật khẩu không đúng",
                            headers={"WWW-Authenticate": "Bearer"},
                        )
            except ImportError:
                logger.warning(
                    "Supabase client not installed, skipping Supabase Auth check"
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Email hoặc mật khẩu không đúng",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            except HTTPException:
                # Re-raise HTTPException để giữ nguyên status code
                raise
            except Exception as e:
                logger.error(f"Error checking Supabase Auth: {e}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Email hoặc mật khẩu không đúng",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        else:
            # Không có cấu hình Supabase, trả về lỗi
            logger.warning(
                f"Login failed: User with email {form_data.username} not found"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Check if user has a password (OAuth users might not have password)
    if not user.hashed_password:
        logger.warning(
            f"Login failed: User {form_data.username} has no password (likely OAuth user)"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản này được đăng ký bằng Google OAuth. Vui lòng đăng nhập bằng Google.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Login failed: Invalid password for user {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản đã bị vô hiệu hóa",
        )
    elif not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản trước khi đăng nhập.",
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Use auth_middleware to create token to ensure consistency with verification
    # This ensures the same secret key is used for both creation and verification
    access_token = auth_middleware.create_access_token(
        user.id, expires_delta=int(access_token_expires.total_seconds() / 60)
    )
    refresh_token = auth_middleware.create_refresh_token(user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
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
        logger.info(
            f"[{time.time() - start_time:.3f}s] Email check query completed in {query_elapsed:.3f}s"
        )

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
        logger.info(
            f"[{time.time() - start_time:.3f}s] Username check query completed in {query_elapsed:.3f}s"
        )

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
        logger.info(
            f"[{time.time() - start_time:.3f}s] Password hashed successfully in {hash_elapsed:.3f}s"
        )

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
            email_verified=user_in.email_verified,  # Use value from schema (default False, can be True for OAuth)
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
        logger.info(
            f"[{time.time() - start_time:.3f}s] Database commit completed in {commit_elapsed:.3f}s"
        )

        logger.info("Refreshing user object...")
        logger.info(f"[{time.time() - start_time:.3f}s] Refreshing user object")
        refresh_start = time.time()
        db.refresh(user)
        refresh_elapsed = time.time() - refresh_start
        logger.info(
            f"[{time.time() - start_time:.3f}s] User object refreshed in {refresh_elapsed:.3f}s"
        )

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


@router.post("/verify-email")
def verify_email(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Verify user's email address
    This endpoint is called when user clicks on email verification link
    """
    if current_user.email_verified:
        return {"message": "Email đã được xác thực", "email_verified": True}

    current_user.email_verified = True
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {"message": "Email đã được xác thực thành công", "email_verified": True}


@router.post("/oauth/google", response_model=Token)
def oauth_google_login(
    request_data: dict = Body(...),
    db: Session = Depends(get_db),
) -> Any:
    """
    OAuth Google login endpoint
    Creates or retrieves user by email and returns access token
    """
    # Parse request data
    email = request_data.get("email")
    full_name = request_data.get("full_name")
    username = request_data.get("username")

    if not email:
        logger.error("Google OAuth login failed: Email is required")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required",
        )

    # Validate email format (basic validation)
    if "@" not in email or "." not in email.split("@")[1]:
        logger.error(f"Google OAuth login failed: Invalid email format: {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format",
        )

    logger.info(f"Google OAuth login attempt for email: {email}")

    # Tìm user theo email
    user = db.query(User).filter(User.email == email).first()

    # Nếu user chưa tồn tại, tự động tạo user mới
    if not user:
        logger.info(f"User not found, creating new user for email: {email}")

        # Tạo username từ email nếu không có
        if not username:
            # Lấy phần trước @ của email làm username
            username = email.split("@")[0]
            # Kiểm tra username đã tồn tại chưa, nếu có thì thêm số
            base_username = username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1

        # Tạo full_name nếu không có
        if not full_name:
            full_name = username  # Dùng username làm full_name tạm thời

        # Tạo user mới (OAuth user không có password)
        user = User(
            email=email,
            username=username,
            full_name=full_name,
            hashed_password="",  # OAuth user không có password
            is_active=True,
            is_superuser=False,
            is_instructor=False,
            email_verified=True,  # Google đã verify email
            avatar_url=None,
            bio=None,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"New user created for Google OAuth: {email} (ID: {user.id})")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản đã bị vô hiệu hóa",
        )

    # Cập nhật email_verified nếu chưa verify (Google đã verify)
    if not user.email_verified:
        user.email_verified = True
        db.commit()
        db.refresh(user)
        logger.info(f"Email verified for user: {email}")

    # Tạo access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_middleware.create_access_token(
        user.id, expires_delta=int(access_token_expires.total_seconds() / 60)
    )
    refresh_token = auth_middleware.create_refresh_token(user.id)

    logger.info(f"Google OAuth login successful for email: {email} (ID: {user.id})")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
def refresh_access_token(
    refresh_token: str = Body(..., embed=True),
    db: Session = Depends(get_db),
) -> Any:
    """
    Refresh access token using refresh token
    """
    from jose import JWTError

    try:
        # Verify refresh token (allow_refresh=True to accept refresh tokens)
        user_id_str = auth_middleware.verify_token(refresh_token, allow_refresh=True)
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token không hợp lệ hoặc đã hết hạn",
            )

        # Verify token type is refresh
        from jose import jwt

        payload = jwt.decode(
            refresh_token,
            auth_middleware.secret_key,
            algorithms=[auth_middleware.algorithm],
        )
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không phải là refresh token",
            )

        # Get user
        user_id = int(user_id_str)
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Người dùng không tồn tại hoặc đã bị vô hiệu hóa",
            )

        # Create new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth_middleware.create_access_token(
            user.id, expires_delta=int(access_token_expires.total_seconds() / 60)
        )

        # Optionally create new refresh token (rotate refresh token)
        new_refresh_token = auth_middleware.create_refresh_token(user.id)

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
        }
    except JWTError as e:
        logger.warning(f"Refresh token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ hoặc đã hết hạn",
        )
