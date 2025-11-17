"""add_content_html_to_materials

Revision ID: add_content_html_materials
Revises: a1b2c3d4e5f6
Create Date: 2025-01-21 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "add_content_html_materials"
down_revision: Union[str, Sequence[str], None] = "5d5bcf2940e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if materials table exists
    tables = inspector.get_table_names()
    if "materials" not in tables:
        return

    # Check if columns already exist
    columns = [col["name"] for col in inspector.get_columns("materials")]

    # Add content_html column (for Rich Text Editor content)
    if "content_html" not in columns:
        op.add_column(
            "materials",
            sa.Column("content_html", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop column
    op.drop_column("materials", "content_html")

