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

    DATABASE_POOL_SIZE: int = 10  # Number of connections to maintain in pool
    DATABASE_MAX_OVERFLOW: int = 20  # Maximum overflow connections

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
    ]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    # Supabase JWT Secret (HS256) - Get from Supabase Dashboard → Project Settings → API → JWT Settings → Secret
    # This is the shared secret used to verify tokens from Supabase/NextAuth
    # IMPORTANT: This is the secret string (long string), NOT the key ID
    SUPABASE_JWT_SECRET: str = ""

    # Redis Cache & Queue
    # NOTE: server/ (Render) does NOT use Redis according to system architecture
    # server/ only communicates with Client and Supabase (Port 5432)
    # Set to empty string to disable Redis connection
    REDIS_URL: str = ""  # Empty = Redis disabled (default for server/)
    REDIS_CACHE_TTL: int = 300  # 5 minutes
    REDIS_RATE_LIMIT_TTL: int = 3600  # 1 hour

    # AI & LLM - Gemini Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL_CHAT: str = "gemini-2.5-flash"
    GEMINI_MODEL_COMPLEX: str = "gemini-2.5-pro"

    # Vector Search
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    VECTOR_DIMENSION: int = 384
    SIMILARITY_THRESHOLD: float = 0.7

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
    CHAT_RATE_LIMIT: int = 50  # per hour
    AI_RATE_LIMIT: int = 20  # per hour

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

    # Feature Flags
    ENABLE_AI_CHAT: bool = True
    ENABLE_DEBATE_ROOM: bool = True
    ENABLE_SOCRATIC_BOT: bool = True
    ENABLE_AUTO_QUIZ_GENERATION: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
