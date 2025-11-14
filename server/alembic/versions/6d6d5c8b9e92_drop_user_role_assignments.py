"""drop user_role_assignments

Revision ID: 6d6d5c8b9e92
Revises: 37bd79f86523
Create Date: 2025-11-13 19:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6d6d5c8b9e92"
down_revision: Union[str, Sequence[str], None] = "37bd79f86523"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("DROP TABLE IF EXISTS user_role_assignments CASCADE")
    op.execute("DROP TYPE IF EXISTS userrole")


def downgrade() -> None:
    """Downgrade schema."""
    role_enum = sa.Enum("admin", "instructor", "student", name="userrole")
    bind = op.get_bind()
    role_enum.create(bind, checkfirst=True)

    op.create_table(
        "user_role_assignments",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auth.users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("domain_id", sa.Integer(), sa.ForeignKey("domains.id"), nullable=True),
        sa.Column("class_id", sa.Integer(), sa.ForeignKey("classes.id"), nullable=True),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.Column(
            "assigned_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auth.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
