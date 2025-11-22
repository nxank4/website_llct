"""remove_unused_test_results_tables

Revision ID: 10b30c34a65e
Revises: a465c2236221
Create Date: 2024-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '10b30c34a65e'
down_revision: Union[str, None] = 'a465c2236221'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop test_results, test_statistics, and student_progress tables"""
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    # Drop test_statistics table
    if 'test_statistics' in tables:
        # Drop indexes first
        indexes = inspector.get_indexes('test_statistics')
        for index in indexes:
            if index['name']:
                try:
                    op.drop_index(index['name'], table_name='test_statistics')
                except Exception:
                    pass
        
        # Drop foreign key constraints
        foreign_keys = inspector.get_foreign_keys('test_statistics')
        for fk in foreign_keys:
            try:
                op.drop_constraint(fk['name'], 'test_statistics', type_='foreignkey')
            except Exception:
                pass
        
        # Drop the table
        op.drop_table('test_statistics')
        print("✅ Dropped table: test_statistics")

    # Drop student_progress table
    if 'student_progress' in tables:
        # Drop indexes first
        indexes = inspector.get_indexes('student_progress')
        for index in indexes:
            if index['name']:
                try:
                    op.drop_index(index['name'], table_name='student_progress')
                except Exception:
                    pass
        
        # Drop foreign key constraints
        foreign_keys = inspector.get_foreign_keys('student_progress')
        for fk in foreign_keys:
            try:
                op.drop_constraint(fk['name'], 'student_progress', type_='foreignkey')
            except Exception:
                pass
        
        # Drop the table
        op.drop_table('student_progress')
        print("✅ Dropped table: student_progress")

    # Drop test_results table
    if 'test_results' in tables:
        # Drop indexes first
        indexes = inspector.get_indexes('test_results')
        for index in indexes:
            if index['name']:
                try:
                    op.drop_index(index['name'], table_name='test_results')
                except Exception:
                    pass
        
        # Drop foreign key constraints
        foreign_keys = inspector.get_foreign_keys('test_results')
        for fk in foreign_keys:
            try:
                op.drop_constraint(fk['name'], 'test_results', type_='foreignkey')
            except Exception:
                pass
        
        # Drop the table
        op.drop_table('test_results')
        print("✅ Dropped table: test_results")


def downgrade() -> None:
    """
    Downgrade is not recommended for destructive operations.
    If needed, recreate tables from original migration files.
    """
    pass
