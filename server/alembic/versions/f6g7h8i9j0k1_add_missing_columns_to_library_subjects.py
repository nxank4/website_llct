"""Add missing columns to library_subjects

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2025-11-10 03:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f6g7h8i9j0k1'
down_revision: Union[str, Sequence[str], None] = 'e5f6g7h8i9j0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing columns to library_subjects table."""
    # Check if columns exist before adding (PostgreSQL specific)
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='credits') THEN
                ALTER TABLE library_subjects ADD COLUMN credits INTEGER;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='department') THEN
                ALTER TABLE library_subjects ADD COLUMN department VARCHAR;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='faculty') THEN
                ALTER TABLE library_subjects ADD COLUMN faculty VARCHAR;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='prerequisite_subjects') THEN
                ALTER TABLE library_subjects ADD COLUMN prerequisite_subjects JSON;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='primary_instructor_id') THEN
                ALTER TABLE library_subjects ADD COLUMN primary_instructor_id INTEGER;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='instructors') THEN
                ALTER TABLE library_subjects ADD COLUMN instructors JSON;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='total_documents') THEN
                ALTER TABLE library_subjects ADD COLUMN total_documents INTEGER DEFAULT 0;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='total_students') THEN
                ALTER TABLE library_subjects ADD COLUMN total_students INTEGER DEFAULT 0;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='library_subjects' AND column_name='is_active') THEN
                ALTER TABLE library_subjects ADD COLUMN is_active BOOLEAN DEFAULT true;
            END IF;
        END $$;
    """)
    
    # Add foreign key constraint if it doesn't exist
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'fk_library_subjects_primary_instructor_id'
            ) THEN
                ALTER TABLE library_subjects 
                ADD CONSTRAINT fk_library_subjects_primary_instructor_id 
                FOREIGN KEY (primary_instructor_id) REFERENCES users(id);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Remove added columns from library_subjects table."""
    op.drop_constraint('fk_library_subjects_primary_instructor_id', 'library_subjects', type_='foreignkey')
    op.drop_column('library_subjects', 'is_active')
    op.drop_column('library_subjects', 'total_students')
    op.drop_column('library_subjects', 'total_documents')
    op.drop_column('library_subjects', 'instructors')
    op.drop_column('library_subjects', 'primary_instructor_id')
    op.drop_column('library_subjects', 'prerequisite_subjects')
    op.drop_column('library_subjects', 'faculty')
    op.drop_column('library_subjects', 'department')
    op.drop_column('library_subjects', 'credits')

