"""add_material_type_to_materials

Revision ID: a1b2c3d4e5f6
Revises: f2c59b1ee092
Create Date: 2025-01-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f2c59b1ee092'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create materialtype enum if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE materialtype AS ENUM ('book', 'video', 'slide', 'document', 'audio', 'image', 'other');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Add material_type column to materials table
    op.add_column('materials', sa.Column('material_type', sa.Enum('book', 'video', 'slide', 'document', 'audio', 'image', 'other', name='materialtype'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Drop material_type column
    op.drop_column('materials', 'material_type')
    
    # Drop enum type (only if no other tables use it)
    op.execute("DROP TYPE IF EXISTS materialtype")

