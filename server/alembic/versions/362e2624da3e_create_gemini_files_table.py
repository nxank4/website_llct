"""create_gemini_files_table

Revision ID: 362e2624da3e
Revises: 6d6d5c8b9e92
Create Date: 2025-11-13 22:47:09.704453

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "362e2624da3e"
down_revision: Union[str, Sequence[str], None] = "6d6d5c8b9e92"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create FileSearchStatus enum (check if it already exists)
    bind = op.get_bind()
    # Check if enum already exists
    result = bind.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'filesearchstatus')"
        )
    )
    enum_exists = result.scalar()

    if not enum_exists:
        # Create enum only if it doesn't exist
        op.execute(
            "CREATE TYPE filesearchstatus AS ENUM ('PENDING', 'INDEXING', 'COMPLETED', 'FAILED')"
        )

    # Define enum for use in table creation
    filesearchstatus_enum = sa.Enum(
        "PENDING",
        "INDEXING",
        "COMPLETED",
        "FAILED",
        name="filesearchstatus",
        create_type=False,
    )

    # Check if table already exists
    result = bind.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gemini_files')"
        )
    )
    table_exists = result.scalar()

    if table_exists:
        # Table already exists, skip creation
        return

    # Create gemini_files table
    op.create_table(
        "gemini_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_name", sa.String(), nullable=True),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("file_type", sa.String(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(), nullable=True),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("status", filesearchstatus_enum, nullable=False),
        sa.Column("operation_name", sa.String(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("gemini_metadata", sa.JSON(), nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("uploader_name", sa.String(), nullable=True),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["subject_id"], ["library_subjects.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by"], ["auth.users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index("ix_gemini_files_id", "gemini_files", ["id"], unique=False)
    op.create_index("ix_gemini_files_title", "gemini_files", ["title"], unique=False)
    op.create_index(
        "ix_gemini_files_subject_id", "gemini_files", ["subject_id"], unique=False
    )
    op.create_index("ix_gemini_files_status", "gemini_files", ["status"], unique=False)
    op.create_index(
        "ix_gemini_files_uploaded_by", "gemini_files", ["uploaded_by"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index("ix_gemini_files_uploaded_by", table_name="gemini_files")
    op.drop_index("ix_gemini_files_status", table_name="gemini_files")
    op.drop_index("ix_gemini_files_subject_id", table_name="gemini_files")
    op.drop_index("ix_gemini_files_title", table_name="gemini_files")
    op.drop_index("ix_gemini_files_id", table_name="gemini_files")

    # Drop table
    op.drop_table("gemini_files")

    # Drop enum
    filesearchstatus_enum = sa.Enum(name="filesearchstatus")
    filesearchstatus_enum.drop(op.get_bind(), checkfirst=True)
