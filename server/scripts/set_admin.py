"""
Script để set admin (superuser) cho user
Usage: python -m scripts.set_admin <email_or_username>
"""
import sys
import os

# Add parent directory to path để import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User
from sqlalchemy import select


def set_admin(email_or_username: str):
    """Set admin (superuser) cho user"""
    db = SessionLocal()
    try:
        # Tìm user theo email hoặc username
        result = db.execute(
            select(User).where(
                (User.email == email_or_username) | (User.username == email_or_username)
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ Không tìm thấy user với email/username: {email_or_username}")
            return False
        
        # Set is_superuser = True
        user.is_superuser = True
        db.commit()
        db.refresh(user)
        
        print(f"✅ Đã set admin thành công cho user:")
        print(f"   - ID: {user.id}")
        print(f"   - Email: {user.email}")
        print(f"   - Username: {user.username}")
        print(f"   - Full Name: {user.full_name}")
        print(f"   - is_superuser: {user.is_superuser}")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khi set admin: {e}")
        return False
    finally:
        db.close()


def list_users():
    """List tất cả users"""
    db = SessionLocal()
    try:
        result = db.execute(select(User).order_by(User.id))
        users = result.scalars().all()
        
        if not users:
            print("❌ Không có user nào trong database")
            return
        
        print("\n📋 Danh sách users:")
        print("-" * 80)
        print(f"{'ID':<5} {'Email':<30} {'Username':<20} {'Superuser':<10} {'Instructor':<10}")
        print("-" * 80)
        
        for user in users:
            print(
                f"{user.id:<5} {user.email:<30} {user.username:<20} "
                f"{'✅' if user.is_superuser else '❌':<10} "
                f"{'✅' if user.is_instructor else '❌':<10}"
            )
        print("-" * 80)
        
    except Exception as e:
        print(f"❌ Lỗi khi list users: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.set_admin <email_or_username>")
        print("       python -m scripts.set_admin --list  (để xem danh sách users)")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_users()
    else:
        email_or_username = sys.argv[1]
        success = set_admin(email_or_username)
        sys.exit(0 if success else 1)

