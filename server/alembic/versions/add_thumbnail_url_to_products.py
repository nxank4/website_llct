"""add_thumbnail_url_to_products

Revision ID: add_thumbnail_url_products
Revises: add_content_html_products
Create Date: 2025-01-22 16:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "add_thumbnail_url_products"
down_revision: Union[str, Sequence[str], None] = "add_content_html_products"
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

    # Add thumbnail_url column (for product thumbnail image)
    if "thumbnail_url" not in columns:
        op.add_column(
            "products",
            sa.Column("thumbnail_url", sa.String(), nullable=True),
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop column
    op.drop_column("products", "thumbnail_url")

