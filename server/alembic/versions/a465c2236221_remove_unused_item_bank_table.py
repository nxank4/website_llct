"""remove_unused_item_bank_table

Revision ID: a465c2236221
Revises: add_assessment_rating_review
Create Date: 2025-11-16 02:36:34.971941

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a465c2236221'
down_revision: Union[str, Sequence[str], None] = 'add_assessment_rating_review'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop RLS policies for item_bank table
    op.execute("DROP POLICY IF EXISTS item_bank_select_policy ON public.item_bank")
    op.execute("DROP POLICY IF EXISTS item_bank_modify_policy ON public.item_bank")
    
    # Drop indexes (if they exist)
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Check if table exists before dropping
    tables = inspector.get_table_names()
    if "item_bank" in tables:
        # Get indexes for item_bank
        indexes = [idx["name"] for idx in inspector.get_indexes("item_bank")]
        for idx_name in indexes:
            if idx_name.startswith("ix_item_bank"):
                op.execute(f"DROP INDEX IF EXISTS {idx_name}")
        
        # Drop foreign key constraints
        op.execute("ALTER TABLE item_bank DROP CONSTRAINT IF EXISTS item_bank_subject_id_fkey")
        op.execute("ALTER TABLE item_bank DROP CONSTRAINT IF EXISTS item_bank_created_by_fkey")
        
        # Drop the table
        op.execute("DROP TABLE IF EXISTS item_bank CASCADE")


def downgrade() -> None:
    """Downgrade schema."""
    # Note: This is a destructive operation, downgrade is not recommended
    # If needed, the table structure can be recreated from the model definition
    pass
