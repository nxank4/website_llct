"""Add email_verified to users table

Revision ID: c3d4e5f6g7h8
Revises: b6595fabf2d2
Create Date: 2025-01-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, Sequence[str], None] = 'b6595fabf2d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add email_verified column to users table
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=True, server_default='false'))
    
    # Update existing users: set email_verified to False for all existing users
    # (You can change this logic if needed)
    op.execute("UPDATE users SET email_verified = false WHERE email_verified IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove email_verified column from users table
    op.drop_column('users', 'email_verified')

