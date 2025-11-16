"""convert_document_enums_to_lowercase

Revision ID: 5d5bcf2940e5
Revises: add_textbook_enum
Create Date: 2025-01-20 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "5d5bcf2940e5"
down_revision: Union[str, Sequence[str], None] = "add_textbook_enum"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert documentstatus and documenttype enums from uppercase to lowercase."""
    conn = op.get_bind()
    
    # 1. Convert documentstatus enum
    # Check if enum exists
    type_check = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documentstatus')")
    )
    status_exists = type_check.scalar()
    
    if status_exists:
        # Check if enum already has lowercase values
        enum_check = conn.execute(
            text("""
                SELECT enumlabel FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'documentstatus')
                ORDER BY enumsortorder
            """)
        )
        enum_values = [row[0] for row in enum_check]
        
        # Only convert if enum has uppercase values
        if enum_values and any(v.isupper() for v in enum_values):
            # Drop RLS policies that depend on status column
            # Check if policy exists before dropping
            policy_check = conn.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_policies 
                        WHERE tablename = 'library_documents' 
                        AND policyname = 'library_documents_select_policy'
                    )
                """)
            )
            policy_exists = policy_check.scalar()
            
            if policy_exists:
                op.execute(text("DROP POLICY IF EXISTS library_documents_select_policy ON library_documents"))
                print("Dropped library_documents_select_policy")
            
            # Check for other policies that might use status column
            other_policies = conn.execute(
                text("""
                    SELECT policyname FROM pg_policies 
                    WHERE tablename = 'library_documents'
                """)
            )
            policies_to_drop = [row[0] for row in other_policies]
            
            for policy_name in policies_to_drop:
                op.execute(text(f"DROP POLICY IF EXISTS {policy_name} ON library_documents"))
                print(f"Dropped policy: {policy_name}")
            
            # Rename old enum
            op.execute(text("ALTER TYPE documentstatus RENAME TO documentstatus_old"))
            
            # Create new enum with lowercase values
            op.execute(text("""
                CREATE TYPE documentstatus AS ENUM ('draft', 'published', 'archived')
            """))
            
            # Update column to use new enum, converting old values to lowercase
            op.execute(text("""
                ALTER TABLE library_documents
                ALTER COLUMN status TYPE documentstatus
                USING lower(status::text)::documentstatus
            """))
            
            # Drop old enum
            op.execute(text("DROP TYPE documentstatus_old"))
            
            # Recreate policies with correct logic
            # Original policy: LOWER(status::text) = 'published' OR auth.uid() = uploaded_by
            # Now simplified since enum is lowercase: status = 'published' OR auth.uid() = uploaded_by
            op.execute(text("""
                CREATE POLICY library_documents_select_policy ON library_documents
                FOR SELECT
                USING (status = 'published' OR auth.uid() = uploaded_by)
            """))
            print("Recreated library_documents_select_policy")
            
            # Recreate modify policy
            op.execute(text("""
                CREATE POLICY library_documents_modify_policy ON library_documents
                FOR ALL
                USING (auth.uid() = uploaded_by)
                WITH CHECK (auth.uid() = uploaded_by)
            """))
            print("Recreated library_documents_modify_policy")
            
            print("Successfully converted documentstatus enum to lowercase")
        else:
            print("documentstatus enum already uses lowercase values")
    
    # 2. Convert documenttype enum
    type_check = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documenttype')")
    )
    type_exists = type_check.scalar()
    
    if type_exists:
        # Check if enum already has lowercase values
        enum_check = conn.execute(
            text("""
                SELECT enumlabel FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'documenttype')
                ORDER BY enumsortorder
            """)
        )
        enum_values = [row[0] for row in enum_check]
        
        # Only convert if enum has uppercase values
        if enum_values and any(v.isupper() for v in enum_values):
            # Rename old enum
            op.execute(text("ALTER TYPE documenttype RENAME TO documenttype_old"))
            
            # Create new enum with lowercase values
            op.execute(text("""
                CREATE TYPE documenttype AS ENUM (
                    'document',
                    'textbook',
                    'presentation',
                    'image',
                    'video',
                    'audio',
                    'archive',
                    'other'
                )
            """))
            
            # Update column to use new enum, converting old values to lowercase
            op.execute(text("""
                ALTER TABLE library_documents
                ALTER COLUMN document_type TYPE documenttype
                USING lower(document_type::text)::documenttype
            """))
            
            # Drop old enum
            op.execute(text("DROP TYPE documenttype_old"))
            print("Successfully converted documenttype enum to lowercase")
        else:
            print("documenttype enum already uses lowercase values")


def downgrade() -> None:
    """Convert documentstatus and documenttype enums from lowercase to uppercase."""
    conn = op.get_bind()
    
    # 1. Convert documentstatus enum back to uppercase
    type_check = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documentstatus')")
    )
    status_exists = type_check.scalar()
    
    if status_exists:
        # Check if enum has lowercase values
        enum_check = conn.execute(
            text("""
                SELECT enumlabel FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'documentstatus')
                ORDER BY enumsortorder
            """)
        )
        enum_values = [row[0] for row in enum_check]
        
        # Only convert if enum has lowercase values
        if enum_values and any(v.islower() for v in enum_values):
            # Rename old enum
            op.execute(text("ALTER TYPE documentstatus RENAME TO documentstatus_old"))
            
            # Create new enum with uppercase values
            op.execute(text("""
                CREATE TYPE documentstatus AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED')
            """))
            
            # Update column to use new enum, converting old values to uppercase
            op.execute(text("""
                ALTER TABLE library_documents
                ALTER COLUMN status TYPE documentstatus
                USING upper(status::text)::documentstatus
            """))
            
            # Drop old enum
            op.execute(text("DROP TYPE documentstatus_old"))
            print("Successfully converted documentstatus enum to uppercase")
    
    # 2. Convert documenttype enum back to uppercase
    type_check = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documenttype')")
    )
    type_exists = type_check.scalar()
    
    if type_exists:
        # Check if enum has lowercase values
        enum_check = conn.execute(
            text("""
                SELECT enumlabel FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'documenttype')
                ORDER BY enumsortorder
            """)
        )
        enum_values = [row[0] for row in enum_check]
        
        # Only convert if enum has lowercase values
        if enum_values and any(v.islower() for v in enum_values):
            # Rename old enum
            op.execute(text("ALTER TYPE documenttype RENAME TO documenttype_old"))
            
            # Create new enum with uppercase values
            op.execute(text("""
                CREATE TYPE documenttype AS ENUM (
                    'DOCUMENT',
                    'TEXTBOOK',
                    'PRESENTATION',
                    'IMAGE',
                    'VIDEO',
                    'AUDIO',
                    'ARCHIVE',
                    'OTHER'
                )
            """))
            
            # Update column to use new enum, converting old values to uppercase
            op.execute(text("""
                ALTER TABLE library_documents
                ALTER COLUMN document_type TYPE documenttype
                USING upper(document_type::text)::documenttype
            """))
            
            # Drop old enum
            op.execute(text("DROP TYPE documenttype_old"))
            print("Successfully converted documenttype enum to uppercase")
