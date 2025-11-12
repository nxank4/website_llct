"""
Script để cập nhật vai trò admin (app_metadata.user_role) thông qua Supabase.
Usage:
    python -m scripts.set_admin <email_or_username>
    python -m scripts.set_admin --list
"""

import sys
import os

# Add parent directory to path để import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.supabase_client import get_supabase_client


def _ensure_client():
    client = get_supabase_client()
    if not client:
        print("❌ Không thể khởi tạo Supabase client. Kiểm tra SUPABASE_URL và SUPABASE_SECRET_KEY.")
        sys.exit(1)
    return client


def _find_user_by_email_or_username(client, identifier: str):
    page = 1
    per_page = 1000

    while True:
        response = client.auth.admin.list_users(page=page, per_page=per_page)
        users = getattr(response, "users", None)
        if users is None and isinstance(response, dict):
            users = response.get("users", [])

        if not users:
            break

        for user in users:
            email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None)
            user_metadata = getattr(user, "user_metadata", None) or (
                user.get("user_metadata") if isinstance(user, dict) else {}
            )
            username = None
            if isinstance(user_metadata, dict):
                username = user_metadata.get("username")

            if identifier.lower() in {
                email.lower() if email else "",
                (username.lower() if username else ""),
            }:
                return user

        if len(users) < per_page:
            break
        page += 1

    return None


def set_admin(identifier: str):
    client = _ensure_client()
    user = _find_user_by_email_or_username(client, identifier)

    if not user:
        print(f"❌ Không tìm thấy user với email/username: {identifier}")
        return False

    user_id = getattr(user, "id", None) or user.get("id")
    email = getattr(user, "email", None) or user.get("email")

    try:
        client.auth.admin.update_user_by_id(
            user_id,
            attributes={
                "app_metadata": {"user_role": "admin"},
            },
        )
        print("✅ Đã cập nhật vai trò admin thành công:")
        print(f"   - ID: {user_id}")
        print(f"   - Email: {email}")
        print("   - user_role (app_metadata): admin")
        return True
    except Exception as exc:
        print(f"❌ Lỗi khi cập nhật vai trò: {exc}")
        return False


def list_users():
    client = _ensure_client()

    page = 1
    per_page = 1000
    rows = []

    try:
        while True:
            response = client.auth.admin.list_users(page=page, per_page=per_page)
            users = getattr(response, "users", None)
            if users is None and isinstance(response, dict):
                users = response.get("users", [])

            if not users:
                break

            for user in users:
                user_id = getattr(user, "id", None) or user.get("id")
                email = getattr(user, "email", None) or user.get("email")
                app_metadata = getattr(user, "app_metadata", None) or (
                    user.get("app_metadata") if isinstance(user, dict) else {}
                )
                role = str(app_metadata.get("user_role", "student")).lower()
                rows.append((user_id, email, role))

            if len(users) < per_page:
                break
            page += 1

        if not rows:
            print("❌ Không tìm thấy user nào thông qua Supabase")
            return

        print("\n📋 Danh sách users (Supabase auth.users):")
        print("-" * 80)
        print(f"{'ID':<40} {'Email':<30} {'Role':<10}")
        print("-" * 80)
        for user_id, email, role in rows:
            print(f"{user_id:<40} {email or 'N/A':<30} {role:<10}")
        print("-" * 80)

    except Exception as exc:
        print(f"❌ Lỗi khi lấy danh sách users: {exc}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.set_admin <email_or_username>")
        print("       python -m scripts.set_admin --list")
        sys.exit(1)

    if sys.argv[1] == "--list":
        list_users()
    else:
        identifier = sys.argv[1]
        success = set_admin(identifier)
        sys.exit(0 if success else 1)

