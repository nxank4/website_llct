"""
Supabase client helper.

Provides a shared REST client for server-side calls that still rely on
Supabase's REST API (e.g., user listing via Admin API). All notifications and
other write paths now use SQLAlchemy directly.
"""

from __future__ import annotations

import logging
from typing import Optional

from supabase import Client, create_client

from .config import settings

logger = logging.getLogger(__name__)

_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    if _client is not None:
        return _client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        logger.warning(
            "Supabase configuration is missing. Set SUPABASE_URL and "
            "SUPABASE_SECRET_KEY in environment variables."
        )
        return None

    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
        logger.info("Supabase client initialised for %s", settings.SUPABASE_URL)
        globals()["_client"] = client
        return client
    except Exception as exc:
        logger.error("Failed to initialise Supabase client: %s", exc)
        return None
