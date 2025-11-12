"""Initial schema relying on Supabase auth.users as user source."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from sqlalchemy.dialects import postgresql

from app.core.database import Base
import app.models  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial schema based on SQLAlchemy models."""
    bind = op.get_bind()

    # Reflect Supabase auth.users so SQLAlchemy can resolve foreign keys.
    auth_users = sa.Table(
        "users",
        Base.metadata,
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        schema="auth",
        autoload_with=bind,
    )

    Base.metadata.create_all(bind=bind, checkfirst=True)
    # Remove reflected table to avoid influencing future operations.
    Base.metadata.remove(auth_users)


def downgrade() -> None:
    """Drop all application tables."""
    bind = op.get_bind()

    auth_users = sa.Table(
        "users",
        Base.metadata,
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        schema="auth",
        autoload_with=bind,
    )
    Base.metadata.drop_all(bind=bind, checkfirst=True)
    Base.metadata.remove(auth_users)
