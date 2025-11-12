"""
Database configuration with Async SQLAlchemy support.

This module provides:
- Async database engines (write: port 5432, read: port 6543)
- RLS (Row Level Security) integration
- Auth.users table stub for foreign key resolution
- Read/Write splitting for optimal performance
"""

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy import text, Table, Column, MetaData
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
from fastapi import Depends
from .config import settings
import logging
import os
import json
from typing import AsyncGenerator, Optional, Any

logger = logging.getLogger(__name__)

# Create metadata object
metadata = MetaData()


# Create Base class for async models
class Base(DeclarativeBase):
    pass


def get_database_url() -> str:
    """
    Get database URL from connection string or individual parameters.
    Returns asyncpg-compatible URL (postgresql+asyncpg://...)
    """
    # Check individual parameters first (useful for pooler connection)
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
    port = settings.DATABASE_PORT or os.getenv("DATABASE_PORT") or os.getenv("port")
    dbname = settings.DATABASE_NAME or os.getenv("DATABASE_NAME") or os.getenv("dbname")

    # If individual parameters are set, use them (priority for pooler connection)
    if username and password and host and port and dbname:
        logger.info(f"Using PostgreSQL connection: {host}:{port}/{dbname}")
        # Use asyncpg driver for async support
        return f"postgresql+asyncpg://{username}:{password}@{host}:{port}/{dbname}"

    # Fall back to DATABASE_URL if individual parameters are not set
    if settings.DATABASE_URL and settings.DATABASE_URL != "sqlite:///./elearning.db":
        # Convert psycopg2 URL to asyncpg if needed
        db_url = settings.DATABASE_URL
        if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif db_url.startswith("postgresql+psycopg2://"):
            db_url = db_url.replace(
                "postgresql+psycopg2://", "postgresql+asyncpg://", 1
            )
        logger.info("Using DATABASE_URL from settings (converted to asyncpg)")
        return db_url

    # Default to SQLite if nothing is configured (should not happen if .env is set correctly)
    logger.warning(
        "No database configuration found, falling back to SQLite. Please set DATABASE_* variables in .env"
    )
    return "sqlite+aiosqlite:///./elearning.db"


def get_read_database_url() -> Optional[str]:
    """
    Get read-only database URL (Transaction pooler port 6543).
    Returns asyncpg-compatible URL.
    """
    # Priority: explicit READ_DATABASE_URL
    if getattr(settings, "READ_DATABASE_URL", ""):
        read_url = settings.READ_DATABASE_URL
        # Convert to asyncpg if needed
        if read_url.startswith("postgresql://") or read_url.startswith("postgres://"):
            read_url = read_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            read_url = read_url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif read_url.startswith("postgresql+psycopg2://"):
            read_url = read_url.replace(
                "postgresql+psycopg2://", "postgresql+asyncpg://", 1
            )
        return read_url

    # Or via env variables (read_* or READ_DATABASE_*), defaulting port 6543 when provided
    read_username = (
        os.getenv("READ_DATABASE_USERNAME")
        or os.getenv("read_user")
        or os.getenv("user")
    )
    read_password = (
        os.getenv("READ_DATABASE_PASSWORD")
        or os.getenv("read_password")
        or os.getenv("password")
    )
    read_host = (
        os.getenv("READ_DATABASE_HOST") or os.getenv("read_host") or os.getenv("host")
    )
    read_port = os.getenv("READ_DATABASE_PORT") or os.getenv("read_port") or "6543"
    read_dbname = (
        os.getenv("READ_DATABASE_NAME")
        or os.getenv("read_dbname")
        or os.getenv("dbname")
        or "postgres"
    )

    if read_username and read_password and read_host:
        return f"postgresql+asyncpg://{read_username}:{read_password}@{read_host}:{read_port}/{read_dbname}"

    return None


# Get database URLs
database_url = get_database_url()
read_database_url = get_read_database_url()

# Create async engine for WRITE operations (Port 5432 - Session Mode)
# Throttle pool_size=1 to prevent MaxClientsInSessionMode error
# CRITICAL: Disable prepared statements (statement_cache_size=0) for Supavisor compatibility
# See: https://github.com/supabase/supavisor/issues/287
engine_write: AsyncEngine = create_async_engine(
    database_url,
    pool_size=1,  # CRITICAL: Throttle to 1 to prevent MaxClientsInSessionMode
    max_overflow=0,  # No overflow for write operations
    pool_pre_ping=True,  # Test connections before using them
    pool_recycle=300,  # Recycle connections every 5 minutes
    echo=settings.ENVIRONMENT == "development",
    future=True,
    connect_args={
        "statement_cache_size": 0,  # Disable prepared statements for Supavisor compatibility
    },
)

# Create async engine for READ operations (Port 6543 - Transaction Mode)
# Can use larger pool for read-only operations
# CRITICAL: Disable prepared statements (statement_cache_size=0) for Supavisor compatibility
# See: https://github.com/supabase/supavisor/issues/287
engine_read: Optional[AsyncEngine] = None
if read_database_url:
    try:
        engine_read = create_async_engine(
            read_database_url,
            pool_size=5,  # Larger pool for read operations
            max_overflow=10,  # Allow overflow for read operations
            pool_pre_ping=True,
            pool_recycle=180,  # Recycle connections every 3 minutes
            echo=False,  # Don't echo read queries
            future=True,
            connect_args={
                "statement_cache_size": 0,  # Disable prepared statements for Supavisor compatibility
            },
        )
        logger.info("Initialized read-only engine via transaction pooler (port 6543)")
    except Exception as e:
        logger.warning(f"Failed to initialize read-only engine: {e}")
        engine_read = None

# Create async session makers
AsyncSessionLocalWrite = async_sessionmaker(
    engine_write,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

AsyncSessionLocalRead = (
    async_sessionmaker(
        engine_read,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    if engine_read
    else None
)


def stub_auth_users_table():
    """
    Create a stub definition for auth.users table in metadata.
    This allows SQLAlchemy to resolve foreign keys that reference auth.users.id
    without needing to reflect the actual table structure.
    """
    try:
        # Check if database is PostgreSQL (not SQLite)
        is_postgresql = database_url.startswith(
            "postgresql"
        ) or database_url.startswith("postgres")

        if not is_postgresql:
            logger.info("SQLite database detected, skipping auth.users stub")
            return

        # Check if auth.users table is already stubbed
        table_key = "auth.users"
        if table_key in Base.metadata.tables:
            logger.debug("auth.users table already stubbed in metadata")
            return

        # Create minimal stub definition for auth.users
        # This allows foreign keys to be validated without reflecting the actual table
        Table(
            "users",
            Base.metadata,
            Column("id", UUID(as_uuid=True), primary_key=True),
            schema="auth",
        )
        logger.info(
            "Created auth.users table stub in metadata for foreign key resolution"
        )

    except Exception as e:
        logger.error(f"Failed to stub auth.users table: {e}")
        # Don't raise - allow app to continue


async def init_database():
    """
    Initialize database with required extensions and stub auth.users table.
    This must be called during application startup.
    """
    try:
        # Check if database is PostgreSQL (not SQLite)
        is_postgresql = database_url.startswith(
            "postgresql"
        ) or database_url.startswith("postgres")

        if not is_postgresql:
            logger.info("SQLite database detected, skipping PostgreSQL extensions")
            return

        # Stub auth.users table first so foreign keys can be validated
        stub_auth_users_table()

        # Enable required PostgreSQL extensions
        async with engine_write.begin() as conn:
            extensions = [
                "CREATE EXTENSION IF NOT EXISTS vector;",
                "CREATE EXTENSION IF NOT EXISTS unaccent;",
                "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
                "CREATE EXTENSION IF NOT EXISTS btree_gin;",
            ]

            for ext in extensions:
                try:
                    await conn.execute(text(ext))
                    logger.info(f"Extension enabled: {ext}")
                except Exception as e:
                    logger.warning(f"Failed to enable extension {ext}: {e}")

    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")


async def set_rls_context(db: AsyncSession, user_id: str) -> None:
    """
    Set Row Level Security (RLS) context for Supabase PostgreSQL.

    This function executes SQL commands to set:
    1. SET LOCAL role = authenticated
    2. SET LOCAL request.jwt.claims = '{"sub":"USER_ID"}'

    This is required for Supabase RLS to work correctly with SQLAlchemy queries.

    Args:
        db: SQLAlchemy async database session
        user_id: User ID from JWT token (can be string UUID or integer)

    Note:
        This must be called before any queries that need RLS filtering.
        The RLS context is set per transaction and will be reset after the transaction ends.
    """
    try:
        # Convert user_id to string if it's not already
        user_id_str = str(user_id)

        # Create JWT claims JSON
        jwt_claims = json.dumps({"sub": user_id_str})

        # Set RLS context
        # Note: SET LOCAL only affects the current transaction
        await db.execute(text("SET LOCAL role = authenticated"))
        await db.execute(text(f"SET LOCAL request.jwt.claims = '{jwt_claims}'"))

        logger.debug(f"RLS context set for user_id: {user_id_str}")

    except Exception as e:
        logger.error(f"Failed to set RLS context: {e}")
        # Don't raise exception here, let the query proceed
        # RLS will still work, but may not filter correctly


def _get_current_user_claims_dependency():
    """Lazy import to avoid circular dependency."""
    from ..middleware.auth import get_current_user_claims

    return get_current_user_claims


async def get_db_session_write(
    claims: Any = Depends(_get_current_user_claims_dependency),
) -> AsyncGenerator[AsyncSession, None]:
    """
    Get async database session for WRITE operations (Port 5432).

    This dependency:
    1. Automatically receives AuthenticatedUser from get_current_user_claims via Depends()
    2. Creates an async session
    3. Automatically sets RLS context based on claims.user_id
    4. Yields the session
    5. Commits or rolls back as needed
    6. Closes the session

    IMPORTANT: This dependency automatically injects get_current_user_claims internally.
    Endpoints do NOT need to declare claims separately - just use:
        db: AsyncSession = Depends(get_db_session_write)

    Usage:
        @router.post("/items")
        async def create_item(
            db: AsyncSession = Depends(get_db_session_write),
        ):
            # RLS is automatically set based on authenticated user
            # No need to manually call set_rls_context or declare claims
            ...
    """
    async with AsyncSessionLocalWrite() as session:
        try:
            # Automatically set RLS context if claims are provided
            # FastAPI will inject claims via Depends() automatically
            if claims and hasattr(claims, "user_id"):
                user_id = str(claims.user_id)
                await set_rls_context(session, user_id)

            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_session_read() -> AsyncGenerator[AsyncSession, None]:
    """
    Get async database session for READ operations (Port 6543 - Transaction Mode).

    This dependency:
    1. Creates an async session from read engine (if available)
    2. Falls back to write engine if read engine is not configured
    3. Yields the session
    4. Closes the session

    Usage:
        @router.get("/items")
        async def list_items(
            db: AsyncSession = Depends(get_db_session_read),
        ):
            ...
    """
    if AsyncSessionLocalRead is None:
        # Fallback to write session if read engine is not available
        async for session in get_db_session_write():
            yield session
        return

    async with AsyncSessionLocalRead() as session:
        try:
            yield session
        finally:
            await session.close()


# Helper functions for direct database connection
async def db_connect():
    """
    Create database engine and connection directly.
    For advanced use cases only.
    """
    return engine_write, await engine_write.connect()


async def create_tables_orm(engine_instance: Optional[AsyncEngine] = None):
    """
    Create tables using ORM Base.
    Similar to reference code pattern.
    """
    engine_to_use = engine_instance or engine_write
    async with engine_to_use.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
