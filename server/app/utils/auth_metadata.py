from __future__ import annotations

from typing import Any, Dict, Optional

ALLOWED_ROLES = {"admin", "instructor", "student"}


def _get_attr(obj: Any, attr: str) -> Any:
    """
    Safely read attribute/field from Supabase auth user structures (object or dict).
    """
    value = getattr(obj, attr, None)
    if value is None and isinstance(obj, dict):
        value = obj.get(attr)
    return value


def resolve_auth_provider(
    auth_user: Any,
    *,
    claims: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """
    Resolve authentication provider (email, google, facebook, ...) from Supabase data.
    """
    app_metadata = _get_attr(auth_user, "app_metadata")
    provider: Optional[str] = None

    if isinstance(app_metadata, dict):
        provider = app_metadata.get("provider")
        if not provider:
            providers = app_metadata.get("providers")
            if isinstance(providers, list) and providers:
                provider = providers[0]

    if not provider and claims:
        claim_app_meta = claims.get("app_metadata")
        if isinstance(claim_app_meta, dict):
            provider = claim_app_meta.get("provider")
        if not provider:
            provider = claims.get("provider")

    if not provider:
        identities = _get_attr(auth_user, "identities")
        if isinstance(identities, list):
            for identity in identities:
                if isinstance(identity, dict):
                    identity_provider = identity.get("provider")
                    if identity_provider:
                        provider = identity_provider
                        break

    if isinstance(provider, str):
        return provider.lower()

    return None


def determine_email_verified(
    auth_user: Any,
    *,
    claims: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Determine whether a Supabase auth user should be treated as email-verified.

    Rules:
    - Email/password users rely on email_confirmed_at or explicit metadata flags.
    - OAuth users (provider != email) are treated as verified if their identity
      reports a verified email or, as a fallback, based on provider presence.
    """
    user_metadata = _get_attr(auth_user, "user_metadata")
    email_verified = bool(getattr(auth_user, "email_confirmed_at", None))

    if not email_verified and isinstance(user_metadata, dict):
        email_verified = bool(
            user_metadata.get("email_verified")
            or user_metadata.get("emailConfirmed")
            or user_metadata.get("email_confirmed_at")
        )

    if not email_verified and claims:
        email_verified = bool(
            claims.get("email_confirmed_at")
            or claims.get("email_confirmed")
            or claims.get("email_verified")
        )
        if not email_verified:
            claim_user_meta = claims.get("user_metadata")
            if isinstance(claim_user_meta, dict):
                email_verified = bool(claim_user_meta.get("email_verified"))

    if email_verified:
        return True

    provider = resolve_auth_provider(auth_user, claims=claims) or "email"
    if provider == "email":
        return False

    identities = _get_attr(auth_user, "identities")
    if isinstance(identities, list):
        for identity in identities:
            if not isinstance(identity, dict):
                continue
            identity_provider = (identity.get("provider") or "").lower()
            if identity_provider == "email":
                continue
            identity_data = identity.get("identity_data")
            if isinstance(identity_data, dict):
                identity_verified = identity_data.get("email_verified")
                if isinstance(identity_verified, bool) and identity_verified:
                    return True
            # If provider exists but no explicit flag, treat OAuth email as verified
            if identity_provider:
                return True

    # Fallback: provider != email implies OAuth (Google, etc.), treat as verified
    return True


def normalize_user_role(value: Optional[str]) -> str:
    """
    Normalize arbitrary role strings to the supported set (admin, instructor, student).
    Legacy values like 'supervisor' or unknown strings fall back to instructor/student.
    """
    if not value or not isinstance(value, str):
        return "student"

    candidate = value.strip().lower()
    if candidate == "supervisor":
        return "instructor"
    if candidate in ALLOWED_ROLES:
        return candidate
    return "student"
