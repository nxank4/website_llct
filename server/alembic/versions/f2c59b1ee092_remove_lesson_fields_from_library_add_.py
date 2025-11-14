"""remove_lesson_fields_from_library_add_to_materials

Revision ID: f2c59b1ee092
Revises: 3792c5fbaa9a
Create Date: 2025-11-14 00:00:56.781193

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2c59b1ee092'
down_revision: Union[str, Sequence[str], None] = '3792c5fbaa9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove lesson fields from library_documents
    op.drop_index('ix_library_documents_lesson_number', table_name='library_documents', if_exists=True)
    op.drop_column('library_documents', 'lesson_title')
    op.drop_column('library_documents', 'lesson_number')
    op.drop_column('library_documents', 'lesson')
    
    # Add chapter and lesson fields to materials (for lectures)
    op.add_column('materials', sa.Column('chapter_number', sa.Integer(), nullable=True))
    op.add_column('materials', sa.Column('chapter_title', sa.String(), nullable=True))
    op.add_column('materials', sa.Column('lesson_number', sa.Integer(), nullable=True))
    op.add_column('materials', sa.Column('lesson_title', sa.String(), nullable=True))
    
    # Create indexes for better query performance
    op.create_index('ix_materials_chapter_number', 'materials', ['chapter_number'])
    op.create_index('ix_materials_lesson_number', 'materials', ['lesson_number'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes and columns from materials
    op.drop_index('ix_materials_lesson_number', table_name='materials', if_exists=True)
    op.drop_index('ix_materials_chapter_number', table_name='materials', if_exists=True)
    op.drop_column('materials', 'lesson_title')
    op.drop_column('materials', 'lesson_number')
    op.drop_column('materials', 'chapter_title')
    op.drop_column('materials', 'chapter_number')
    
    # Re-add lesson fields to library_documents
    op.add_column('library_documents', sa.Column('lesson', sa.String(), nullable=True))
    op.add_column('library_documents', sa.Column('lesson_number', sa.Integer(), nullable=True))
    op.add_column('library_documents', sa.Column('lesson_title', sa.String(), nullable=True))
    op.create_index('ix_library_documents_lesson_number', 'library_documents', ['lesson_number'])
