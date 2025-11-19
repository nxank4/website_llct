"""remap_notificationtype_enum

Revision ID: e2b4b4f9bf2c
Revises: d9a3f4a9a8b7
Create Date: 2025-11-19 19:50:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e2b4b4f9bf2c"
down_revision: Union[str, Sequence[str], None] = "d9a3f4a9a8b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change type to TEXT temporarily
    op.execute("ALTER TABLE notifications ALTER COLUMN type TYPE TEXT")

    # Map legacy values -> new categories
    op.execute(
        """
        UPDATE notifications
        SET type = CASE
            WHEN type ILIKE 'announcement' THEN 'system'
            WHEN type ILIKE 'assignment' THEN 'instructor'
            WHEN type ILIKE 'document' THEN 'instructor'
            WHEN type ILIKE 'alert' THEN 'alert'
            WHEN type ILIKE 'system' THEN 'system'
            WHEN type ILIKE 'instructor' THEN 'instructor'
            WHEN type ILIKE 'general' THEN 'general'
            ELSE 'general'
        END
    """
    )

    # Drop & recreate enum
    op.execute("DROP TYPE IF EXISTS notificationtype")
    op.execute(
        "CREATE TYPE notificationtype AS ENUM ('system', 'instructor', 'alert', 'general')"
    )

    # Convert column back to enum
    op.execute(
        "ALTER TABLE notifications ALTER COLUMN type TYPE notificationtype USING type::notificationtype"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE notifications ALTER COLUMN type TYPE TEXT")
    op.execute("DROP TYPE IF EXISTS notificationtype")
    op.execute(
        """
        CREATE TYPE notificationtype AS ENUM ('ANNOUNCEMENT', 'ASSIGNMENT', 'DOCUMENT', 'NEWS')
    """
    )
    op.execute(
        """
        UPDATE notifications
        SET type = CASE
            WHEN type = 'system' THEN 'ANNOUNCEMENT'
            WHEN type = 'instructor' THEN 'ASSIGNMENT'
            WHEN type = 'alert' THEN 'NEWS'
            ELSE 'NEWS'
        END
    """
    )
    op.execute(
        "ALTER TABLE notifications ALTER COLUMN type TYPE notificationtype USING type::notificationtype"
    )

