"""add_chapter_lesson_number_title_fields

Revision ID: 3792c5fbaa9a
Revises: a66c1590028d
Create Date: 2025-11-13 23:52:31.545033

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3792c5fbaa9a'
down_revision: Union[str, Sequence[str], None] = 'a66c1590028d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new chapter and lesson fields
    op.add_column('library_documents', sa.Column('chapter_number', sa.Integer(), nullable=True))
    op.add_column('library_documents', sa.Column('chapter_title', sa.String(), nullable=True))
    op.add_column('library_documents', sa.Column('lesson_number', sa.Integer(), nullable=True))
    op.add_column('library_documents', sa.Column('lesson_title', sa.String(), nullable=True))
    
    # Create indexes for better query performance
    op.create_index('ix_library_documents_chapter_number', 'library_documents', ['chapter_number'])
    op.create_index('ix_library_documents_lesson_number', 'library_documents', ['lesson_number'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_library_documents_lesson_number', table_name='library_documents')
    op.drop_index('ix_library_documents_chapter_number', table_name='library_documents')
    
    # Drop columns
    op.drop_column('library_documents', 'lesson_title')
    op.drop_column('library_documents', 'lesson_number')
    op.drop_column('library_documents', 'chapter_title')
    op.drop_column('library_documents', 'chapter_number')
