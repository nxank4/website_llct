"""add_is_quick_test_to_assessment_results

Revision ID: add_quick_test_flag
Revises: add_question_extended_fields
Create Date: 2025-01-20 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "add_quick_test_flag"  # Shortened to fit 32 char limit
down_revision: Union[str, Sequence[str], None] = "add_question_extended_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if assessment_results table exists
    tables = inspector.get_table_names()
    if "assessment_results" not in tables:
        return

    # Check if is_quick_test column already exists
    columns = [col["name"] for col in inspector.get_columns("assessment_results")]
    
    if "is_quick_test" not in columns:
        op.add_column(
            "assessment_results",
            sa.Column("is_quick_test", sa.Boolean(), nullable=False, server_default="false"),
        )
        # Add index for better query performance
        op.create_index(
            "ix_assessment_results_is_quick_test",
            "assessment_results",
            ["is_quick_test"],
        )

    # Make assessment_id nullable for quick tests
    # Check current nullable status
    assessment_id_col = next(
        (col for col in inspector.get_columns("assessment_results") if col["name"] == "assessment_id"),
        None
    )
    if assessment_id_col and not assessment_id_col["nullable"]:
        op.alter_column(
            "assessment_results",
            "assessment_id",
            existing_type=sa.String(),
            nullable=True,
        )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)

    tables = inspector.get_table_names()
    if "assessment_results" not in tables:
        return

    columns = [col["name"] for col in inspector.get_columns("assessment_results")]

    # Drop is_quick_test column and index
    if "is_quick_test" in columns:
        op.drop_index("ix_assessment_results_is_quick_test", table_name="assessment_results")
        op.drop_column("assessment_results", "is_quick_test")

    # Revert assessment_id to not nullable (WARNING: may fail if there are NULL values)
    # Note: This is commented out because it may cause data loss
    # If you need to downgrade, first delete all rows with NULL assessment_id
    # op.alter_column(
    #     "assessment_results",
    #     "assessment_id",
    #     existing_type=sa.String(),
    #     nullable=False,
    # )

