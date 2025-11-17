from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "E-Learning Platform"
    ENVIRONMENT: str = "development"

    # Database - Supabase PostgreSQL
    # For Backend API (Render): Use Supavisor Pooler Session Mode (Port 5432)
    #
    # IMPORTANT: Render only accepts IPv4 connections, but Supabase direct connection maps to IPv6.
    # Solution: Use Supavisor pooler in session mode (port 5432) instead of direct connection.
    #
    # This is ideal for persistent servers (VMs, Droplets, Render) as it provides:
    # - IPv4 compatibility (works with Render)
    # - Server-side connection pooling via Supavisor
    # - Application-side connection pooling via SQLAlchemy
    # - Good performance for long-running processes
    #
    # Get connection string from Supabase Dashboard:
    # Project Settings -> Database -> Connection string -> "Connection pooling" -> "Session mode"
    # Format: postgres://[db-user].[project-ref]:[db-password]@aws-0-[aws-region].pooler.supabase.com:5432/postgres
    #
    # SQLAlchemy will handle connection pooling automatically via QueuePool
    # Recommended: Limit connections to 40% of available if using REST Client, or 80% if not
    DATABASE_URL: str = (
        "sqlite:///./elearning.db"  # Default to SQLite for local dev (fallback only)
    )

    # Individual database parameters (priority over DATABASE_URL)
    # These will be used to construct the connection string if all are set
    DATABASE_USERNAME: str = ""
    DATABASE_PASSWORD: str = ""
    DATABASE_HOST: str = ""
    DATABASE_PORT: str = ""
    DATABASE_NAME: str = ""

    DATABASE_POOL_SIZE: int = 3  # Tăng nhẹ để tránh nghẽn khi nhiều request đồng thời
    DATABASE_MAX_OVERFLOW: int = 3
    DATABASE_POOL_TIMEOUT: int = 5  # giây, thời gian chờ lấy connection từ pool

    # Optional: Read-only (Transaction pooler 6543) dedicated URL
    READ_DATABASE_URL: str = ""

    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "http://localhost:8000",
        "http://localhost:8001",
        "https://websitellct.vercel.app",
        "https://website-llct.onrender.com",
        "https://website-llct-737975601167.asia-east1.run.app",
    ]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    # Supabase Secret Key (Service Role Key) - Used for server-side Supabase client
    # Get from Supabase Dashboard → Project Settings → API → API Keys → service_role key
    SUPABASE_SECRET_KEY: str = ""
    # Supabase JWT verification
    # Supabase has migrated from Legacy JWT Secret to new JWT Signing Keys
    # Use JWKS URL for asymmetric key verification (RS256/ES256)
    # Get from: https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
    SUPABASE_JWKS_URL: str = ""

    # Redis Cache & Queue
    # NOTE: server/ (Render) does NOT use Redis according to system architecture
    # server/ only communicates with Client and Supabase (Port 5432)
    # Set to empty string to disable Redis connection
    REDIS_URL: str = ""  # Empty = Redis disabled (default for server/)
    REDIS_CACHE_TTL: int = 300  # 5 minutes
    REDIS_RATE_LIMIT_TTL: int = 3600  # 1 hour

    # Vector Search
    # File Storage
    UPLOAD_MAX_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: List[str] = [
        ".pdf",
        ".docx",
        ".txt",
        ".md",
        ".jpg",
        ".png",
        ".mp4",
    ]
    STORAGE_BUCKET: str = "materials"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour

    # Monitoring
    SENTRY_DSN: str = ""
    PROMETHEUS_ENABLED: bool = True
    LOG_LEVEL: str = "INFO"

    # Email settings
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = ""
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = ""
    EMAILS_FROM_NAME: str = "E-Learning Platform"

    # AI Server (Cloud Run)
    # URL of the ai-server deployed on GCP Cloud Run
    # Local: http://localhost:8001
    # Production: https://your-cloud-run-url
    AI_SERVER_URL: str = "http://localhost:8001"

    # Feature Flags
    # NOTE: AI feature flags are handled by ai-server/ (Cloud Run)
    ENABLE_AI_CHAT: bool = True  # Not used - handled by ai-server/
    ENABLE_DEBATE_ROOM: bool = True  # Not used - handled by ai-server/
    ENABLE_SOCRATIC_BOT: bool = True  # Not used - handled by ai-server/
    ENABLE_AUTO_QUIZ_GENERATION: bool = True  # Not used - handled by ai-server/

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
