"""add_question_extended_fields

Revision ID: add_question_extended_fields
Revises: 10b30c34a65e
Create Date: 2025-11-16 03:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "add_question_extended_fields"
down_revision: Union[str, Sequence[str], None] = "10b30c34a65e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if questions table exists
    tables = inspector.get_table_names()
    if "questions" not in tables:
        return

    # Get existing columns
    questions_columns = [col["name"] for col in inspector.get_columns("questions")]

    # Add allow_multiple_selection column (if not exists)
    if "allow_multiple_selection" not in questions_columns:
        op.add_column(
            "questions",
            sa.Column(
                "allow_multiple_selection",
                sa.Boolean(),
                nullable=True,
                server_default="false",
            ),
        )

    # Add word_limit column (if not exists)
    if "word_limit" not in questions_columns:
        op.add_column(
            "questions",
            sa.Column("word_limit", sa.Integer(), nullable=True),
        )

    # Add input_type column (if not exists)
    if "input_type" not in questions_columns:
        op.add_column(
            "questions",
            sa.Column("input_type", sa.String(), nullable=True),
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop columns from questions table
    op.drop_column("questions", "input_type")
    op.drop_column("questions", "word_limit")
    op.drop_column("questions", "allow_multiple_selection")
