"""
Configuration for AI Server (Cloud Run)

Simplified architecture using Gemini File Search API.
No longer uses LangChain, pgvector, or Supabase for vector storage.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Server - Gemini File Search"
    ENVIRONMENT: str = "production"
    LOG_LEVEL: str = "INFO"

    # Supabase JWT verification (for user authentication)
    # Supabase has migrated from Legacy JWT Secret to new JWT Signing Keys
    # Use JWKS URL for asymmetric key verification (RS256/ES256)
    # Get from: https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
    SUPABASE_JWKS_URL: str = ""

    # Gemini AI Configuration
    # Get API key from Google AI Studio: https://aistudio.google.com/apikey
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL_CHAT: str = "gemini-2.5-flash"
    GEMINI_MODEL_COMPLEX: str = "gemini-2.5-pro"

    # File Search Store Configuration
    # Create File Search Store in Google AI Studio or via API
    # Format: fileSearchStores/your-store-name
    FILE_SEARCH_STORE_NAME: str = ""

    # Upstash Redis Configuration (for caching)
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # Cache Configuration
    CACHE_TTL_SECONDS: int = 900  # 15 minutes

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "https://website-llct.onrender.com",
        "https://websitellct.vercel.app",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8001",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
