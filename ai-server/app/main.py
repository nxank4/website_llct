"""
AI Server - FastAPI application for Gemini File Search

This server runs on Cloud Run and handles:
- Chat queries using Gemini File Search API
- File uploads to File Search Store
- Simplified architecture without LangChain or pgvector
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager

from .core.config import settings
from .api.api_v1.api import api_router

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting AI Server (Gemini File Search)...")

    # Validate configuration
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not configured")
    if not settings.FILE_SEARCH_STORE_NAME:
        logger.warning("FILE_SEARCH_STORE_NAME not configured")

    logger.info("AI Server started successfully")

    yield

    # Shutdown
    logger.info("Shutting down AI Server...")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Server for Gemini File Search integration",
    version="2.0.0",
    lifespan=lifespan,
)

# Set up CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/")
def read_root():
    return {
        "message": "AI Server - Gemini File Search",
        "version": "2.0.0",
        "features": [
            "Gemini File Search integration",
            "Simplified architecture (no LangChain/pgvector)",
            "File upload to File Search Store",
            "Serverless optimized (Cloud Run)",
        ],
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-server",
        "gemini": "available" if settings.GEMINI_API_KEY else "not_configured",
        "file_search_store": "configured" if settings.FILE_SEARCH_STORE_NAME else "not_configured",
    }


# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "internal_error"},
    )
