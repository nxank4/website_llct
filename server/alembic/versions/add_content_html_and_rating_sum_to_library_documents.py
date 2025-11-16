"""add_content_html_and_rating_sum_to_library_documents

Revision ID: add_content_html_rating_sum
Revises: add_is_quick_test_to_assessment_results
Create Date: 2025-01-20 14:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# revision identifiers, used by Alembic.
revision: str = "add_content_html_rating_sum"
down_revision: Union[str, Sequence[str], None] = "add_quick_test_flag"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if library_documents table exists
    tables = inspector.get_table_names()
    if "library_documents" not in tables:
        return

    # Add "textbook" value to documenttype enum if it doesn't exist
    # PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE
    # So we need to check first and handle the error if it already exists
    try:
        # Check if enum type exists
        type_check = conn.execute(
            text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documenttype')")
        )
        type_exists = type_check.scalar()
        
        if type_exists:
            # Check if "textbook" value already exists
            enum_check = conn.execute(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1 FROM pg_enum 
                        WHERE enumlabel = 'textbook' 
                        AND enumtypid = (
                            SELECT oid FROM pg_type WHERE typname = 'documenttype'
                        )
                    )
                    """
                )
            )
            textbook_exists = enum_check.scalar()
            
            if not textbook_exists:
                # Add "textbook" to documenttype enum
                # Note: This must be in a transaction and cannot be rolled back easily
                op.execute(text("ALTER TYPE documenttype ADD VALUE 'textbook'"))
    except Exception as e:
        # If enum doesn't exist or value already exists, log and continue
        # This is safe because the enum might be created differently or value already exists
        print(f"Note: Could not add 'textbook' to documenttype enum: {e}")

    # Check if columns already exist
    columns = [col["name"] for col in inspector.get_columns("library_documents")]

    # Add content_html column (for Rich Text Editor content)
    if "content_html" not in columns:
        op.add_column(
            "library_documents",
            sa.Column("content_html", sa.Text(), nullable=True),
        )

    # Add rating_sum column (to store sum of all ratings for calculating average)
    if "rating_sum" not in columns:
        op.add_column(
            "library_documents",
            sa.Column("rating_sum", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop columns
    op.drop_column("library_documents", "rating_sum")
    op.drop_column("library_documents", "content_html")

