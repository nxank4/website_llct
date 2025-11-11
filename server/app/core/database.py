from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from .config import settings
import logging
import os
import json

logger = logging.getLogger(__name__)

# Create metadata object
metadata = MetaData()


# Get database URL from connection string or individual parameters
# Supports both DATABASE_URL (connection string) and individual parameters
# Similar to reference code pattern
def get_database_url():
    """Get database URL from connection string or individual parameters"""
    # Check individual parameters first (useful for pooler connection)
    # Use settings (pydantic-settings) which automatically loads from .env
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
        return f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{dbname}"

    # Fall back to DATABASE_URL if individual parameters are not set
    if settings.DATABASE_URL and settings.DATABASE_URL != "sqlite:///./elearning.db":
        logger.info("Using DATABASE_URL from settings")
        return settings.DATABASE_URL

    # Default to SQLite if nothing is configured (should not happen if .env is set correctly)
    logger.warning(
        "No database configuration found, falling back to SQLite. Please set DATABASE_* variables in .env"
    )
    return "sqlite:///./elearning.db"


# Create database engine with connection pooling
# pool_pre_ping=True: Test connections before using them (pessimistic disconnect handling)
# pool_recycle=3600: Recycle connections every hour to prevent stale connections
# connect_args: Additional connection arguments for better error handling
database_url = get_database_url()
engine = create_engine(
    database_url,
    poolclass=QueuePool,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=getattr(settings, "DATABASE_POOL_TIMEOUT", 5),
    pool_pre_ping=True,
    pool_recycle=300,
    pool_reset_on_return="commit",
    pool_use_lifo=True,
    echo=settings.ENVIRONMENT == "development",
)

# Optional read-only engine (Transaction pooler 6543) to reduce Session-mode pressure
def get_read_database_url():
    # Priority: explicit READ_DATABASE_URL
    if getattr(settings, "READ_DATABASE_URL", ""):
        return settings.READ_DATABASE_URL
    # Or via env variables (read_* or READ_DATABASE_*), defaulting port 6543 when provided
    read_username = os.getenv("READ_DATABASE_USERNAME") or os.getenv("read_user") or os.getenv("user")
    read_password = os.getenv("READ_DATABASE_PASSWORD") or os.getenv("read_password") or os.getenv("password")
    read_host = os.getenv("READ_DATABASE_HOST") or os.getenv("read_host") or os.getenv("host")
    read_port = os.getenv("READ_DATABASE_PORT") or os.getenv("read_port") or "6543"
    read_dbname = os.getenv("READ_DATABASE_NAME") or os.getenv("read_dbname") or os.getenv("dbname") or "postgres"
    if read_username and read_password and read_host:
        return f"postgresql+psycopg2://{read_username}:{read_password}@{read_host}:{read_port}/{read_dbname}"
    return None

read_database_url = get_read_database_url()
read_engine = None
if read_database_url:
    try:
        read_engine = create_engine(
            read_database_url,
            poolclass=QueuePool,
            pool_size=1,
            max_overflow=0,
            pool_pre_ping=True,
            pool_recycle=180,
            pool_reset_on_return="commit",
            pool_use_lifo=True,
            echo=False,
        )
        logger.info("Initialized read-only engine via transaction pooler")
    except Exception as e:
        logger.warning(f"Failed to initialize read-only engine: {e}")

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
ReadSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=read_engine) if read_engine else None

# Create Base class
Base = declarative_base()


def init_database():
    """Initialize database with required extensions"""
    try:
        # Check if database is PostgreSQL (not SQLite)
        database_url = get_database_url()
        is_postgresql = database_url.startswith(
            "postgresql"
        ) or database_url.startswith("postgres")

        if not is_postgresql:
            logger.info("SQLite database detected, skipping PostgreSQL extensions")
            return

        with engine.connect() as conn:
            # Enable required PostgreSQL extensions (only for PostgreSQL)
            extensions = [
                "CREATE EXTENSION IF NOT EXISTS vector;",
                "CREATE EXTENSION IF NOT EXISTS unaccent;",
                "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
                "CREATE EXTENSION IF NOT EXISTS btree_gin;",
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
    """Get database session (dependency for FastAPI)

    Ensures session is always closed, even on errors.
    This prevents connection pool exhaustion.

    Note: Endpoints should manage their own commit/rollback.
    This function only ensures the session is closed.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        # Rollback on errors (endpoints should also rollback, but this is a safety net)
        db.rollback()
        raise
    finally:
        # Always close session to return connection to pool
        # This is critical to prevent connection pool exhaustion
        db.close()


def get_read_db():
    """Get read-only database session using transaction pooler (if configured).

    Fallback to primary session if read engine is not available.
    """
    if ReadSessionLocal is None:
        # Fallback to primary SessionLocal
        yield from get_db()
        return
    db = ReadSessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Helper functions for direct database connection (similar to reference code)
def db_connect():
    """
    Create database engine and connection directly.
    Similar to reference code pattern.
    """
    return engine, engine.connect()


def create_tables(engine_instance=None):
    """
    Create tables using metadata.
    Similar to reference code pattern.
    """
    engine_to_use = engine_instance or engine
    metadata.drop_all(engine_to_use, checkfirst=True)
    metadata.create_all(engine_to_use, checkfirst=True)


def create_tables_orm(engine_instance=None):
    """
    Create tables using ORM Base.
    Similar to reference code pattern.
    """
    engine_to_use = engine_instance or engine
    Base.metadata.drop_all(engine_to_use, checkfirst=True)
    Base.metadata.create_all(engine_to_use, checkfirst=True)


def create_session(engine_instance=None):
    """
    Create a new database session.
    Similar to reference code pattern.
    """
    engine_to_use = engine_instance or engine
    Session = sessionmaker(bind=engine_to_use)
    session = Session()
    return session


# Async database dependency (for future use)
async def get_async_db():
    # This will be implemented when we add async support
    pass


def set_rls_context(db: Session, user_id: str) -> None:
    """
    Set Row Level Security (RLS) context for Supabase PostgreSQL.

    This function executes SQL commands to set:
    1. SET LOCAL role = authenticated
    2. SET LOCAL request.jwt.claims = '{"sub":"USER_ID"}'

    This is required for Supabase RLS to work correctly with SQLAlchemy queries.

    Args:
        db: SQLAlchemy database session
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
        db.execute(text("SET LOCAL role = authenticated"))
        db.execute(text(f"SET LOCAL request.jwt.claims = '{jwt_claims}'"))

        logger.debug(f"RLS context set for user_id: {user_id_str}")

    except Exception as e:
        logger.error(f"Failed to set RLS context: {e}")
        # Don't raise exception here, let the query proceed
        # RLS will still work, but may not filter correctly
        pass
