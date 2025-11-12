"""
API Router for AI Server

This router includes all API endpoints for the AI server.
"""

from fastapi import APIRouter
from .endpoints import chat, file_upload

api_router = APIRouter()

# Include chat router
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

# Include file upload router
api_router.include_router(file_upload.router, prefix="/files", tags=["files"])

