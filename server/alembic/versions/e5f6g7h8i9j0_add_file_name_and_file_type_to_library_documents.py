"""Add file_name and file_type to library_documents

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2025-01-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6g7h8i9j0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add file_name and file_type columns to library_documents table
    op.add_column('library_documents', sa.Column('file_name', sa.String(), nullable=True))
    op.add_column('library_documents', sa.Column('file_type', sa.String(), nullable=True))
    
    # Add other missing columns if they don't exist
    # Check if columns exist before adding (PostgreSQL specific)
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='author') THEN
                ALTER TABLE library_documents ADD COLUMN author VARCHAR;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='instructor_id') THEN
                ALTER TABLE library_documents ADD COLUMN instructor_id INTEGER;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='keywords') THEN
                ALTER TABLE library_documents ADD COLUMN keywords JSON;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='semester') THEN
                ALTER TABLE library_documents ADD COLUMN semester VARCHAR;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='academic_year') THEN
                ALTER TABLE library_documents ADD COLUMN academic_year VARCHAR;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='chapter') THEN
                ALTER TABLE library_documents ADD COLUMN chapter VARCHAR;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='lesson') THEN
                ALTER TABLE library_documents ADD COLUMN lesson VARCHAR;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='rating') THEN
                ALTER TABLE library_documents ADD COLUMN rating FLOAT DEFAULT 0.0;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='rating_count') THEN
                ALTER TABLE library_documents ADD COLUMN rating_count INTEGER DEFAULT 0;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_documents' AND column_name='published_at') THEN
                ALTER TABLE library_documents ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove columns
    op.drop_column('library_documents', 'file_name')
    op.drop_column('library_documents', 'file_type')
    # Note: We don't drop other columns in downgrade to avoid data loss

