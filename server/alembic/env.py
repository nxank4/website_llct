from logging.config import fileConfig
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the parent directory to the path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import Base and all models
from app.core.database import Base, stub_auth_users_table
from app.core.config import settings
# Ensure all models are imported so Base.metadata is populated
from app import models  # noqa: F401

# Stub auth.users table for foreign key resolution
# This must be called before metadata is used by Alembic
stub_auth_users_table()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


def get_sync_database_url() -> str:
    """
    Get SYNC database URL for Alembic migrations.
    
    Alembic runs in synchronous context, so it needs a sync engine (psycopg2),
    not async engine (asyncpg). This function converts async URL to sync URL.
    
    Returns:
        PostgreSQL URL with psycopg2 driver (postgresql+psycopg2://...)
    """
    # Get database connection parameters
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

    # If individual parameters are set, use them
    if username and password and host and port and dbname:
        # Use psycopg2 driver for sync operations (Alembic)
        return f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{dbname}"

    # Fall back to DATABASE_URL if individual parameters are not set
    if settings.DATABASE_URL and settings.DATABASE_URL != "sqlite:///./elearning.db":
        db_url = settings.DATABASE_URL
        # Convert asyncpg URL to psycopg2 for sync operations
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
        elif db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
        return db_url

    # Default to SQLite if nothing is configured
    return "sqlite:///./elearning.db"


# Override sqlalchemy.url with SYNC database URL for Alembic
# Alembic needs sync engine (psycopg2), not async engine (asyncpg)
config.set_main_option("sqlalchemy.url", get_sync_database_url())

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def include_object(object, name, type_, reflected, compare_to):
    """
    Filter function to exclude auth schema from autogenerate.
    
    This prevents Alembic from trying to create/drop tables in the 'auth' schema,
    which is a system schema managed by Supabase and not accessible to regular users.
    
    Args:
        object: The object being considered
        name: Name of the object
        type_: Type of object ('table', 'column', etc.)
        reflected: Whether the object was reflected from the database
        compare_to: The object being compared to
    
    Returns:
        True if the object should be included in autogenerate, False otherwise
    """
    # Exclude all objects in the 'auth' schema
    if hasattr(object, "schema") and object.schema == "auth":
        return False
    
    # Include all other objects
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,  # Exclude auth schema from autogenerate
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,  # Exclude auth schema from autogenerate
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
