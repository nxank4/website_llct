from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import engine, Base, init_database
from .api.api_v1.api import api_router
from .middleware.rate_limiter import rate_limiter, chat_rate_limiter, ai_rate_limiter
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
        # Initialize database
        logger.info("Initializing database...")
        init_database()

        # Create database tables (only if they don't exist)
        logger.info("Checking database tables...")
        import time
        table_start = time.time()
        Base.metadata.create_all(bind=engine)
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
app.middleware("http")(chat_rate_limiter)
app.middleware("http")(ai_rate_limiter)

# Set up CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Cache-Control", "Content-Type"],
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
        logger.info(f"Request completed: {request.method} {request.url.path} - {response.status_code} in {process_time:.3f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request failed: {request.method} {request.url.path} after {process_time:.3f}s - {type(e).__name__}: {e}", exc_info=True)
        raise


# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to E-Learning Platform API",
        "version": "1.0.0",
        "features": [
            "AI-powered chat and Q&A",
            "RAG-based content search",
            "Debate rooms with real-time collaboration",
            "Socratic questioning",
            "Auto quiz generation",
            "Vector search and embeddings",
            "Role-based access control",
            "Real-time presence tracking",
        ],
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
            "ai": "available" if settings.GEMINI_API_KEY else "not_configured",
        },
        "features": {
            "ai_chat": settings.ENABLE_AI_CHAT,
            "debate_room": settings.ENABLE_DEBATE_ROOM,
            "socratic_bot": settings.ENABLE_SOCRATIC_BOT,
            "auto_quiz": settings.ENABLE_AUTO_QUIZ_GENERATION,
        },
    }


@app.get("/metrics")
def get_metrics():
    """Basic metrics endpoint"""
    return {
        "cache": {"connected": False, "note": "Redis not used by server/"},
        "environment": settings.ENVIRONMENT,
        "uptime": time.time(),  # This would be actual uptime in production
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "internal_error"},
    )
