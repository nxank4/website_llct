"""add_assessment_rating_and_review_fields

Revision ID: add_assessment_rating_review
Revises: a1b2c3d4e5f6
Create Date: 2025-01-20 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "add_assessment_rating_review"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    # Check if columns exist in assessments table
    inspector = inspect(conn)
    assessments_columns = [col["name"] for col in inspector.get_columns("assessments")]

    # Add rating fields to assessments table (if not exists)
    if "rating" not in assessments_columns:
        op.add_column(
            "assessments",
            sa.Column("rating", sa.Float(), nullable=True, server_default="0.0"),
        )
    if "rating_count" not in assessments_columns:
        op.add_column(
            "assessments",
            sa.Column("rating_count", sa.Integer(), nullable=True, server_default="0"),
        )

    # Add review settings to assessments table (if not exists)
    if "show_results" not in assessments_columns:
        op.add_column(
            "assessments",
            sa.Column(
                "show_results", sa.Boolean(), nullable=True, server_default="true"
            ),
        )
    if "show_explanations" not in assessments_columns:
        op.add_column(
            "assessments",
            sa.Column(
                "show_explanations", sa.Boolean(), nullable=True, server_default="true"
            ),
        )

    # Create assessment_ratings table (if not exists)
    tables = inspector.get_table_names()
    if "assessment_ratings" not in tables:
        op.create_table(
            "assessment_ratings",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("assessment_id", sa.Integer(), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("feedback", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(
                ["assessment_id"], ["assessments.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["user_id"], ["auth.users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "assessment_id", "user_id", name="uq_assessment_user_rating"
            ),
        )
        op.create_index(
            op.f("ix_assessment_ratings_assessment_id"),
            "assessment_ratings",
            ["assessment_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_assessment_ratings_user_id"),
            "assessment_ratings",
            ["user_id"],
            unique=False,
        )
    else:
        # Table exists, check if indexes exist
        indexes = [idx["name"] for idx in inspector.get_indexes("assessment_ratings")]
        if "ix_assessment_ratings_assessment_id" not in indexes:
            op.create_index(
                op.f("ix_assessment_ratings_assessment_id"),
                "assessment_ratings",
                ["assessment_id"],
                unique=False,
            )
        if "ix_assessment_ratings_user_id" not in indexes:
            op.create_index(
                op.f("ix_assessment_ratings_user_id"),
                "assessment_ratings",
                ["user_id"],
                unique=False,
            )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop assessment_ratings table
    op.drop_index(
        op.f("ix_assessment_ratings_user_id"), table_name="assessment_ratings"
    )
    op.drop_index(
        op.f("ix_assessment_ratings_assessment_id"), table_name="assessment_ratings"
    )
    op.drop_table("assessment_ratings")

    # Remove review settings from assessments table
    op.drop_column("assessments", "show_explanations")
    op.drop_column("assessments", "show_results")

    # Remove rating fields from assessments table
    op.drop_column("assessments", "rating_count")
    op.drop_column("assessments", "rating")
