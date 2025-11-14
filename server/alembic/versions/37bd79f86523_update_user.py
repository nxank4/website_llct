"""update user

Revision ID: 37bd79f86523
Revises: 54531527be7c
Create Date: 2025-11-13 14:14:08.954836

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "37bd79f86523"
down_revision: Union[str, Sequence[str], None] = "54531527be7c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "profiles",
        sa.Column("username", sa.String(), nullable=True),
        schema=None,
    )
    # Ensure username values are unique when present
    op.create_unique_constraint("uq_profiles_username", "profiles", ["username"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_profiles_username", "profiles", type_="unique")
    op.drop_column("profiles", "username")
