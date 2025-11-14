"""remove_keywords_from_library_documents

Revision ID: a66c1590028d
Revises: d075be53c8ed
Create Date: 2025-11-13 23:42:52.238646

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a66c1590028d'
down_revision: Union[str, Sequence[str], None] = 'd075be53c8ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop keywords column from library_documents table
    op.drop_column('library_documents', 'keywords')


def downgrade() -> None:
    """Downgrade schema."""
    # Re-add keywords column (as JSON, nullable)
    op.add_column('library_documents', sa.Column('keywords', sa.JSON(), nullable=True))
