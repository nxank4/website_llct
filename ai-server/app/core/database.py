"""
Database connection for AI Server (Cloud Run)

This uses Pooler Transaction Mode (Port 6543) which is optimized for serverless
environments with transient connections.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool  # Use NullPool for serverless
from .config import settings
import os
import logging

logger = logging.getLogger(__name__)


# Compose database URL from individual params if provided
def get_database_url() -> str:
    # Prefer individual params if set (align with server formatting)
    username = (
        settings.DATABASE_USERNAME
        or os.getenv("DATABASE_USERNAME")
        or os.getenv("user")
    )
    password = (
        settings.DATABASE_PASSWORD
        or os.getenv("DATABASE_PASSWORD")
        or os.getenv("password")
    )
    host = settings.DATABASE_HOST or os.getenv("DATABASE_HOST") or os.getenv("host")
    port = (
        settings.DATABASE_PORT
        or os.getenv("DATABASE_PORT")
        or os.getenv("port")
        or "6543"
    )
    dbname = (
        settings.DATABASE_NAME
        or os.getenv("DATABASE_NAME")
        or os.getenv("dbname")
        or "postgres"
    )

    if username and password and host:
        return f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{dbname}"

    # Fallback to DATABASE_URL
    return settings.DATABASE_URL


database_url = get_database_url()

# Create database engine optimized for serverless
# NullPool is used because Cloud Run creates new instances per request
# and we don't want to maintain connection pools across requests
engine = create_engine(
    database_url,
    poolclass=NullPool,  # No connection pooling - each request gets a fresh connection
    pool_pre_ping=True,  # Verify connections before using
    connect_args={
        "connect_timeout": 10,  # 10 second timeout
        "options": "-c statement_timeout=30000",  # 30 second statement timeout
    },
    echo=settings.ENVIRONMENT == "development",
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()


def init_database():
    """Initialize database with required extensions"""
    try:
        with engine.connect() as conn:
            # Enable required PostgreSQL extensions
            extensions = [
                "CREATE EXTENSION IF NOT EXISTS vector;",
                "CREATE EXTENSION IF NOT EXISTS unaccent;",
                "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            ]

            for ext in extensions:
                try:
                    conn.execute(text(ext))
                    conn.commit()
                    logger.info(f"Extension enabled: {ext}")
                except Exception as e:
                    logger.warning(f"Failed to enable extension {ext}: {e}")

    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")


# Dependency to get database session
def get_db():
    """
    Get database session for serverless environment.

    Note: Each request gets a fresh connection due to NullPool.
    This is optimal for Cloud Run's request-based model.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
