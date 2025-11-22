"""add_content_html_to_products

Revision ID: add_content_html_products
Revises: 2c8b5a856d61
Create Date: 2025-11-22 15:55:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "add_content_html_products"
down_revision: Union[str, Sequence[str], None] = "2c8b5a856d61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if products table exists
    tables = inspector.get_table_names()
    if "products" not in tables:
        return

    # Check if columns already exist
    columns = [col["name"] for col in inspector.get_columns("products")]

    # Add content_html column (for Rich Text Editor content)
    if "content_html" not in columns:
        op.add_column(
            "products",
            sa.Column("content_html", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop column
    op.drop_column("products", "content_html")

