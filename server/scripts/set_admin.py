"""
CLI tool to manage Supabase user roles (app_metadata) in line with the
new role-selection system.

Usage examples:
    # List all users with their current roles
    python -m scripts.set_admin --list

    # Promote a user to admin (adds admin to roles array)
    python -m scripts.set_admin user@example.com

    # Assign instructor role and replace existing roles array
    python -m scripts.set_admin user@example.com --role instructor --force-single-role
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Sequence

# Add parent directory to path để import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.supabase_client import get_supabase_client  # noqa: E402
from app.utils.auth_metadata import normalize_user_role  # noqa: E402

VALID_ROLES = ("admin", "instructor", "student")


def _ensure_client():
    client = get_supabase_client()
    if not client:
        print(
            "❌ Không thể khởi tạo Supabase client. Kiểm tra SUPABASE_URL và SUPABASE_SECRET_KEY."
        )
        sys.exit(1)
    return client


def _normalize_role(role: str) -> str:
    role_lower = role.lower().strip()
    if role_lower not in VALID_ROLES:
        raise ValueError(
            f"Vai trò không hợp lệ: {role}. Vai trò hợp lệ: {', '.join(VALID_ROLES)}"
        )
    return role_lower


def _ensure_user_iterable(response: Any) -> List[Any]:
    if response is None:
        return []
    if isinstance(response, list):
        return response
    users = getattr(response, "users", None)
    if users is None and isinstance(response, dict):
        users = response.get("users")
    if users is None:
        return []
    if isinstance(users, list):
        return users
    return list(users)


def _get_user_attr(user: Any, attr: str, default: Any = None) -> Any:
    value = getattr(user, attr, None)
    if value is None and isinstance(user, dict):
        value = user.get(attr, default)
    return value if value is not None else default


def _extract_roles(app_metadata: Any) -> List[str]:
    if not isinstance(app_metadata, dict):
        return []
    roles = app_metadata.get("roles")
    if isinstance(roles, list):
        normalized = []
        for item in roles:
            if isinstance(item, str):
                value = item.lower().strip()
                if value:
                    normalized.append(value)
        return normalized
    return []


def _merge_roles(
    existing: Sequence[str], new_role: str, force_single: bool
) -> List[str]:
    if force_single:
        return [new_role]
    roles = list(dict.fromkeys([*(r for r in existing if r in VALID_ROLES), new_role]))
    return roles


def _find_user_by_email_or_username(client, identifier: str):
    page = 1
    per_page = 1000
    identifier_lower = identifier.lower().strip()

    while True:
        response = client.auth.admin.list_users(page=page, per_page=per_page)
        users = _ensure_user_iterable(response)

        if not users:
            break

        for user in users:
            email = _get_user_attr(user, "email")
            app_metadata = _get_user_attr(user, "app_metadata", {})
            user_metadata = _get_user_attr(user, "user_metadata", {})

            username = None
            if isinstance(user_metadata, dict):
                username = user_metadata.get("username")
            if not username and isinstance(app_metadata, dict):
                username = app_metadata.get("username")

            candidates = {
                email.lower() if isinstance(email, str) else "",
                username.lower() if isinstance(username, str) else "",
            }

            if identifier_lower in candidates:
                return user

        if len(users) < per_page:
            break
        page += 1

    return None


def set_role(identifier: str, role: str, force_single_role: bool = False) -> bool:
    client = _ensure_client()
    normalized_role = _normalize_role(role)
    user = _find_user_by_email_or_username(client, identifier)

    if not user:
        print(f"❌ Không tìm thấy user với email/username: {identifier}")
        return False

    user_id = _get_user_attr(user, "id")
    email = _get_user_attr(user, "email")
    app_metadata = _get_user_attr(user, "app_metadata", {})

    if not user_id:
        print("❌ User không có ID hợp lệ")
        return False

    existing_roles = _extract_roles(app_metadata)
    updated_roles = _merge_roles(existing_roles, normalized_role, force_single_role)

    updated_metadata: Dict[str, Any] = {}
    if isinstance(app_metadata, dict):
        updated_metadata.update(app_metadata)

    updated_metadata["user_role"] = normalized_role
    updated_metadata["roles"] = updated_roles
    updated_metadata["role_updated_at"] = datetime.now(timezone.utc).isoformat()
    updated_metadata.setdefault("role_updated_by", "scripts.set_admin")

    try:
        client.auth.admin.update_user_by_id(
            user_id,
            attributes={
                "app_metadata": updated_metadata,
            },
        )
        print("✅ Đã cập nhật vai trò thành công:")
        print(f"   - ID: {user_id}")
        print(f"   - Email: {email}")
        print(f"   - user_role: {normalized_role}")
        print(
            f"   - roles: {', '.join(updated_roles) if updated_roles else '⌀ (empty)'}"
        )
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"❌ Lỗi khi cập nhật vai trò: {exc}")
        return False


def list_users():
    client = _ensure_client()

    page = 1
    per_page = 1000
    rows: List[Dict[str, Any]] = []

    try:
        while True:
            response = client.auth.admin.list_users(page=page, per_page=per_page)
            users = _ensure_user_iterable(response)

            if not users:
                break

            for user in users:
                user_id = _get_user_attr(user, "id")
                email = _get_user_attr(user, "email")
                app_metadata = _get_user_attr(user, "app_metadata", {})
                user_role = normalize_user_role(app_metadata.get("user_role"))
                roles = _extract_roles(app_metadata)

                rows.append(
                    {
                        "id": user_id,
                        "email": email or "N/A",
                        "user_role": user_role,
                        "roles": roles,
                    }
                )

            if len(users) < per_page:
                break
            page += 1

        if not rows:
            print("❌ Không tìm thấy user nào thông qua Supabase")
            return

        print("\n📋 Danh sách users (Supabase auth.users):")
        print("-" * 110)
        print(f"{'ID':<40} {'Email':<30} {'user_role':<12} {'roles':<25}")
        print("-" * 110)
        for row in rows:
            roles_str = ", ".join(row["roles"]) if row["roles"] else "-"
            print(
                f"{row['id']:<40} {row['email']:<30} {row['user_role']:<12} {roles_str:<25}"
            )
        print("-" * 110)

    except Exception as exc:  # noqa: BLE001
        print(f"❌ Lỗi khi lấy danh sách users: {exc}")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Quản lý vai trò Supabase thông qua app_metadata",
    )
    parser.add_argument(
        "identifier",
        nargs="?",
        help="Email hoặc username của user",
    )
    parser.add_argument(
        "--role",
        "-r",
        default="admin",
        choices=VALID_ROLES,
        help="Vai trò cần gán (mặc định: admin)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Liệt kê users và vai trò hiện tại",
    )
    parser.add_argument(
        "--force-single-role",
        action="store_true",
        help="Ghi đè danh sách roles hiện tại chỉ với role mới",
    )
    return parser


if __name__ == "__main__":
    parser = _build_parser()
    args = parser.parse_args()

    if args.list:
        list_users()
        sys.exit(0)

    if not args.identifier:
        parser.error("Bạn phải cung cấp email hoặc username khi không dùng --list")

    success = set_role(args.identifier, args.role, args.force_single_role)
    sys.exit(0 if success else 1)
