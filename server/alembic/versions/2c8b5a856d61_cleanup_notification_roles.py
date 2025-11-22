"""cleanup_notification_roles

Revision ID: 2c8b5a856d61
Revises: e2b4b4f9bf2c
Create Date: 2025-11-19 20:06:51.520337

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '2c8b5a856d61'
down_revision: Union[str, Sequence[str], None] = 'e2b4b4f9bf2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
