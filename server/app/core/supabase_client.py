"""
Supabase Client for Backend Server

This module provides a Supabase client instance for server-side operations.
Uses service_role key to bypass RLS when needed (e.g., creating notifications).
"""

from supabase import create_client, Client
from typing import Optional
import logging

from .config import settings

logger = logging.getLogger(__name__)

# Global Supabase client instance
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Get or create Supabase client instance for backend server.

    Uses service_role key to bypass RLS for server-side operations.

    Returns:
        Supabase client instance or None if configuration is missing
    """
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        logger.warning(
            "Supabase configuration is missing. "
            "Set SUPABASE_URL and SUPABASE_SECRET_KEY in environment variables."
        )
        return None

    try:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY,  # Service role key (bypasses RLS)
        )
        logger.info("Supabase client initialized successfully")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None
