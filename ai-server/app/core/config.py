"""
Configuration for AI Server (Cloud Run)

This server uses Pooler Transaction Mode (Port 6543) for Supabase connections.
This is ideal for serverless environments like Cloud Run where each request
may create a new transient connection.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Server - RAG & Gemini"
    ENVIRONMENT: str = "production"
    LOG_LEVEL: str = "INFO"

    # Database - Supabase PostgreSQL
    # For AI Server (Cloud Run): Use Pooler Transaction Mode (Port 6543)
    #
    # This is ideal for serverless environments (Cloud Run, Lambda, Edge Functions) because:
    # - Handles many transient connections efficiently
    # - Prevents connection exhaustion
    # - Optimized for request/response patterns
    #
    # Get connection string from Supabase Dashboard:
    # Project Settings -> Database -> Connection string -> "Connection pooling" -> "Transaction mode"
    # Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
    #
    # Note: Port 6543 is for Transaction Mode (not Session Mode)
    DATABASE_URL: str = ""

    # Individual database parameters (optional). If provided, they will be used
    # to construct DATABASE_URL automatically (priority over DATABASE_URL).
    DATABASE_USERNAME: str = ""
    DATABASE_PASSWORD: str = ""
    DATABASE_HOST: str = ""
    DATABASE_PORT: str = "6543"
    DATABASE_NAME: str = "postgres"

    # Supabase URL and Keys (for LangChain VectorStore)
    # Get from Supabase Dashboard → Project Settings → API
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    # Supabase JWT verification
    # Supabase has migrated from Legacy JWT Secret to new JWT Signing Keys
    # Use JWKS URL for asymmetric key verification (RS256/ES256)
    # Get from: https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
    SUPABASE_JWKS_URL: str = ""

    # Gemini AI Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL_CHAT: str = "gemini-2.5-flash"
    GEMINI_MODEL_COMPLEX: str = "gemini-2.5-pro"

    # Upstash Redis Configuration (for caching)
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # RAG Configuration
    RAG_TOP_K: int = 3
    RAG_TTL_SECONDS: int = 900  # 15 minutes

    # Vector Search
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    VECTOR_DIMENSION: int = 384
    SIMILARITY_THRESHOLD: float = 0.7

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "https://website-llct.onrender.com",
        "https://your-frontend-domain.vercel.app",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8001",
    ]

    # Rate Limiting
    AI_RATE_LIMIT: int = 20  # per hour

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
