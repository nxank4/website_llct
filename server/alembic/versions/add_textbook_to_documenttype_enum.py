"""add_textbook_to_documenttype_enum

Revision ID: add_textbook_enum
Revises: add_content_html_rating_sum
Create Date: 2025-01-20 15:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "add_textbook_enum"
down_revision: Union[str, Sequence[str], None] = "add_content_html_rating_sum"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add 'textbook' value to documenttype enum."""
    conn = op.get_bind()
    
    # Check if enum type exists
    type_check = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documenttype')")
    )
    type_exists = type_check.scalar()
    
    if not type_exists:
        print("Warning: documenttype enum does not exist. Skipping.")
        return
    
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
        # Note: ALTER TYPE ADD VALUE cannot be rolled back in a transaction
        # So we execute it outside of the transaction context
        op.execute(text("ALTER TYPE documenttype ADD VALUE 'textbook'"))
        print("Successfully added 'textbook' to documenttype enum")
    else:
        print("'textbook' already exists in documenttype enum")


def downgrade() -> None:
    """Remove 'textbook' value from documenttype enum."""
    # Note: PostgreSQL does not support removing enum values directly
    # This would require recreating the enum type, which is complex
    # For now, we'll just log a warning
    print("Warning: Cannot remove enum values in PostgreSQL. Manual intervention required.")
    pass

