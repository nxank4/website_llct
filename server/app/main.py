from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging
import time
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import engine_write, Base, init_database, create_tables_orm
from .api.api_v1.api import api_router
from .middleware.rate_limiter import rate_limiter

# Import models to ensure they are registered with SQLAlchemy before database initialization
import app.models  # noqa: F401
# NOTE: redis_service removed - server/ does not use Redis according to system architecture

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
    logger.info("Starting E-Learning Platform API...")

    try:
        # Initialize database (async)
        logger.info("Initializing database...")
        await init_database()

        # Create database tables (only if they don't exist) - async
        logger.info("Checking database tables...")
        import time

        table_start = time.time()
        await create_tables_orm()
        table_elapsed = time.time() - table_start
        logger.info(f"Database tables ready in {table_elapsed:.3f}s")

        # NOTE: Redis is not used by server/ according to system architecture
        # server/ only communicates with Client and Supabase (Port 5432)

        logger.info("Application startup complete. Ready to accept requests.")
    except Exception as e:
        logger.error(f"Error during startup: {e}", exc_info=True)
        # Don't raise - let the app start anyway, but log the error
        # This allows the server to start even if database connection fails initially

    yield

    # Shutdown
    logger.info("Shutting down E-Learning Platform API...")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Advanced E-Learning Platform with AI-powered features",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Add middleware
app.middleware("http")(rate_limiter)

# Set up CORS
# Always add CORS middleware, use default origins if not set
cors_origins = (
    settings.BACKEND_CORS_ORIGINS
    if settings.BACKEND_CORS_ORIGINS
    else [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "http://localhost:8000",
        "http://localhost:8001",
    ]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Cache-Control", "Content-Type", "X-Process-Time"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    # Log incoming requests
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        logger.info(
            f"Request completed: {request.method} {request.url.path} - {response.status_code} in {process_time:.3f}s"
        )
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Request failed: {request.method} {request.url.path} after {process_time:.3f}s - {type(e).__name__}: {e}",
            exc_info=True,
        )
        raise


# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static files for serving uploaded files (lectures, library documents, etc.)
# Ensure uploads directory exists
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

# Mount static files at /uploads to serve files from uploads/ directory
# This allows clients to access files via /uploads/lectures/{filename} or /uploads/library/{filename}
try:
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    logger.info("Static files mounted at /uploads")
except Exception as e:
    logger.warning(
        f"Failed to mount static files: {e}. File serving may not work correctly."
    )


@app.get("/")
def read_root():
    return {
        "message": "Welcome to E-Learning Platform API",
        "version": "1.0.0",
        "features": [
            "User management",
            "Course management",
            "Assessment system",
            "Role-based access control",
        ],
        "note": "AI features are handled by ai-server/ (Cloud Run)",
    }


@app.get("/health")
def health_check():
    """Health check endpoint with system status"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "database": "connected",
            "redis": "not_used",  # server/ does not use Redis according to system architecture
            "ai": "handled_by_ai_server",  # AI features are handled by ai-server/ (Cloud Run)
        },
        "note": "AI features (RAG, Gemini, Redis cache) are handled by ai-server/ (Cloud Run)",
    }


@app.get("/metrics")
def get_metrics():
    """Basic metrics endpoint"""
    return {
        "cache": {"connected": False, "note": "Redis not used by server/"},
        "environment": settings.ENVIRONMENT,
        "uptime": time.time(),  # This would be actual uptime in production
    }


# Exception handler for HTTPException - let FastAPI handle it properly
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Get CORS origins for headers
    cors_origins = (
        settings.BACKEND_CORS_ORIGINS
        if settings.BACKEND_CORS_ORIGINS
        else [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:8080",
            "http://localhost:8000",
            "http://localhost:8001",
        ]
    )
    origin = request.headers.get("origin")
    cors_headers = {}
    if origin and origin in cors_origins:
        cors_headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }

    # Merge with existing headers
    headers = dict(exc.headers) if hasattr(exc, "headers") and exc.headers else {}
    headers.update(cors_headers)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


# Global exception handler for other exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)

    # Get CORS origins for headers
    cors_origins = (
        settings.BACKEND_CORS_ORIGINS
        if settings.BACKEND_CORS_ORIGINS
        else [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:8080",
            "http://localhost:8000",
            "http://localhost:8001",
        ]
    )
    origin = request.headers.get("origin")
    cors_headers = {}
    if origin and origin in cors_origins:
        cors_headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "internal_error"},
        headers=cors_headers,
    )
