"""
API Router for AI Server

This router includes all API endpoints for the AI server.
"""

from fastapi import APIRouter
from .endpoints import chat

api_router = APIRouter()

# Include chat router
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

