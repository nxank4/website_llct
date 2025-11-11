"""
AI Server - FastAPI application for RAG and Gemini integration

This server runs on Cloud Run and handles:
- RAG (Retrieval-Augmented Generation) queries
- Gemini AI integration
- Vector search and embeddings

Uses Pooler Transaction Mode (Port 6543) for Supabase connections.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import engine, Base, init_database
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
    logger.info("Starting AI Server (RAG & Gemini)...")

    # Initialize database
    init_database()

    # Create database tables if needed
    Base.metadata.create_all(bind=engine)

    logger.info("AI Server started successfully")

    yield

    # Shutdown
    logger.info("Shutting down AI Server...")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Server for RAG and Gemini integration",
    version="1.0.0",
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
        "message": "AI Server - RAG & Gemini",
        "version": "1.0.0",
        "features": [
            "RAG (Retrieval-Augmented Generation)",
            "Gemini AI integration",
            "Vector search and embeddings",
            "Serverless optimized (Cloud Run)",
        ],
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-server",
        "database": "connected" if settings.DATABASE_URL else "not_configured",
        "gemini": "available" if settings.GEMINI_API_KEY else "not_configured",
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
