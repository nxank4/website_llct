from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging
import time
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import init_database, create_tables_orm
from .api.api_v1.api import api_router
from .middleware.rate_limiter import rate_limiter

# Import models to ensure they are registered with SQLAlchemy before database initialization
import app.models  # noqa: F401
# NOTE: redis_service removed - server/ does not use Redis according to system architecture

# Setup logging first
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize Prometheus metrics (if enabled)
prometheus_available = False
# Initialize metrics variables to avoid NameError
http_requests_total = None
http_request_duration_seconds = None
http_requests_in_progress = None
http_errors_total = None
db_query_duration_seconds = None
db_connections_active = None
db_connections_idle = None
db_query_errors_total = None
app_uptime_seconds = None
app_start_time = None

if settings.PROMETHEUS_ENABLED:
    try:
        from prometheus_client import (
            generate_latest,
            CONTENT_TYPE_LATEST,
            Counter,
            Histogram,
            Gauge,
            REGISTRY,
        )

        # Unregister existing metrics if module is reloaded (for uvicorn reload)
        metric_names = [
            "http_requests_total",
            "http_request_duration_seconds",
            "http_requests_in_progress",
            "http_errors_total",
            "db_query_duration_seconds",
            "db_connections_active",
            "db_connections_idle",
            "db_query_errors_total",
            "app_uptime_seconds",
        ]
        for name in metric_names:
            try:
                collector = REGISTRY._names_to_collectors.get(name)
                if collector is not None:
                    REGISTRY.unregister(collector)
            except (KeyError, AttributeError, ValueError):
                pass  # Metric doesn't exist yet, that's fine

        # HTTP Request metrics
        http_requests_total = Counter(
            "http_requests_total",
            "Total number of HTTP requests",
            ["method", "endpoint", "status_code"],
        )
        http_request_duration_seconds = Histogram(
            "http_request_duration_seconds",
            "HTTP request duration in seconds",
            ["method", "endpoint"],
            buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0),
        )
        http_requests_in_progress = Gauge(
            "http_requests_in_progress",
            "Number of HTTP requests currently being processed",
        )
        http_errors_total = Counter(
            "http_errors_total",
            "Total number of HTTP errors",
            ["method", "endpoint", "error_type"],
        )

        # Database metrics
        db_query_duration_seconds = Histogram(
            "db_query_duration_seconds",
            "Database query duration in seconds",
            ["operation", "table"],
            buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0),
        )
        db_connections_active = Gauge(
            "db_connections_active",
            "Number of active database connections",
            ["pool"],
        )
        db_connections_idle = Gauge(
            "db_connections_idle",
            "Number of idle database connections",
            ["pool"],
        )
        db_query_errors_total = Counter(
            "db_query_errors_total",
            "Total number of database query errors",
            ["operation", "error_type"],
        )

        # Application metrics
        app_uptime_seconds = Gauge(
            "app_uptime_seconds",
            "Application uptime in seconds",
        )

        # Track app start time
        app_start_time = time.time()

        prometheus_available = True
        logger.info("Prometheus metrics enabled")
    except ImportError:
        prometheus_available = False
        logger.warning(
            "prometheus-client not installed. Install with: uv add prometheus-client"
        )
else:
    logger.info("Prometheus metrics disabled")

# Initialize Sentry for error tracking (if DSN is provided)
if settings.SENTRY_DSN and settings.SENTRY_DSN != "your-sentry-dsn":
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            # Add data like request headers and IP for users
            send_default_pii=True,
            # Performance monitoring
            traces_sample_rate=1.0 if settings.ENVIRONMENT == "development" else 0.1,
            profiles_sample_rate=1.0 if settings.ENVIRONMENT == "development" else 0.1,
        )
        logger.info("Sentry initialized for error tracking")
    except ImportError:
        logger.warning(
            "sentry-sdk not installed. Install with: uv add sentry-sdk[fastapi]"
        )
    except Exception as e:
        logger.warning(f"Failed to initialize Sentry: {e}")
else:
    logger.info("Sentry not configured (SENTRY_DSN not set or is placeholder)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting E-Learning Platform API...")

    # Initialize database with timeout to avoid blocking startup too long
    # This allows the app to start quickly and respond to health checks
    import asyncio

    try:
        # Initialize database (async) with short timeout
        logger.info("Initializing database...")
        try:
            await asyncio.wait_for(init_database(), timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning(
                "Database initialization timed out (5s), continuing anyway..."
            )

        # Create database tables (only if they don't exist) - async with timeout
        logger.info("Checking database tables...")
        table_start = time.time()
        try:
            await asyncio.wait_for(create_tables_orm(), timeout=10.0)
            table_elapsed = time.time() - table_start
            logger.info(f"Database tables ready in {table_elapsed:.3f}s")
        except asyncio.TimeoutError:
            logger.warning(
                "Database table creation timed out (10s), continuing anyway..."
            )

        logger.info("Database initialization complete.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}", exc_info=True)
        # Don't raise - let the app start anyway, but log the error
        # This allows the server to start even if database connection fails initially

        # NOTE: Redis is not used by server/ according to system architecture
        # server/ only communicates with Client and Supabase (Port 5432)

        logger.info("Application startup complete. Ready to accept requests.")

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


# Request timing middleware with Prometheus metrics
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    # Skip logging for health check endpoint (Render sends these every 5 seconds)
    is_health_check = request.url.path == "/health"
    is_metrics = request.url.path == "/metrics"

    # Track request in progress (skip metrics endpoint to avoid recursion)
    if prometheus_available and not is_metrics and http_requests_in_progress:
        http_requests_in_progress.inc()

    if not is_health_check:
        logger.info(f"Incoming request: {request.method} {request.url.path}")

    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)

        # Record Prometheus metrics
        if prometheus_available and not is_metrics:
            method = request.method
            endpoint = request.url.path
            status_code = str(response.status_code)
            if http_requests_total:
                http_requests_total.labels(
                    method=method, endpoint=endpoint, status_code=status_code
                ).inc()
            if http_request_duration_seconds:
                http_request_duration_seconds.labels(
                    method=method, endpoint=endpoint
                ).observe(process_time)
            if http_requests_in_progress:
                http_requests_in_progress.dec()

            # Track errors (4xx, 5xx)
            if response.status_code >= 400 and http_errors_total:
                error_type = "4xx" if 400 <= response.status_code < 500 else "5xx"
                http_errors_total.labels(
                    method=method, endpoint=endpoint, error_type=error_type
                ).inc()

        if not is_health_check:
            logger.info(
                f"Request completed: {request.method} {request.url.path} - {response.status_code} in {process_time:.3f}s"
            )
        return response
    except Exception as e:
        process_time = time.time() - start_time
        status_code = "500"

        # Record Prometheus metrics for errors
        if prometheus_available and not is_metrics:
            method = request.method
            endpoint = request.url.path
            if http_requests_total:
                http_requests_total.labels(
                    method=method, endpoint=endpoint, status_code=status_code
                ).inc()
            if http_request_duration_seconds:
                http_request_duration_seconds.labels(
                    method=method, endpoint=endpoint
                ).observe(process_time)
            if http_requests_in_progress:
                http_requests_in_progress.dec()

            # Track error
            if http_errors_total:
                error_type = type(e).__name__
                http_errors_total.labels(
                    method=method, endpoint=endpoint, error_type=error_type
                ).inc()

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
    """Health check endpoint with system status - responds immediately for Render"""
    # This endpoint must respond quickly for Render health checks
    # Database status is checked asynchronously in background
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "database": "initializing",  # Database initializes in background
            "redis": "not_used",  # server/ does not use Redis according to system architecture
            "ai": "handled_by_ai_server",  # AI features are handled by ai-server/ (Cloud Run)
        },
        "note": "AI features (RAG, Gemini, Redis cache) are handled by ai-server/ (Cloud Run)",
    }


@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    if prometheus_available and settings.PROMETHEUS_ENABLED:
        # Update uptime metric
        if app_uptime_seconds and app_start_time:
            app_uptime_seconds.set(time.time() - app_start_time)

        # Update database pool metrics if available
        try:
            from app.core.database import engine_write, engine_read

            # Write pool metrics
            if (
                engine_write
                and hasattr(engine_write, "pool")
                and db_connections_active
                and db_connections_idle
            ):
                pool = engine_write.pool
                # SQLAlchemy Pool methods exist but linter doesn't recognize them
                active = pool.size() - pool.checkedout()  # type: ignore
                idle = pool.checkedin()  # type: ignore
                db_connections_active.labels(pool="write").set(active)
                db_connections_idle.labels(pool="write").set(idle)

            # Read pool metrics
            if (
                engine_read
                and hasattr(engine_read, "pool")
                and db_connections_active
                and db_connections_idle
            ):
                pool = engine_read.pool
                # SQLAlchemy Pool methods exist but linter doesn't recognize them
                active = pool.size() - pool.checkedout()  # type: ignore
                idle = pool.checkedin()  # type: ignore
                db_connections_active.labels(pool="read").set(active)
                db_connections_idle.labels(pool="read").set(idle)
        except Exception:
            # Ignore errors in metrics collection
            pass

        # Return Prometheus format metrics
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
    else:
        # Fallback to basic JSON metrics if Prometheus is disabled
        return {
            "cache": {"connected": False, "note": "Redis not used by server/"},
            "environment": settings.ENVIRONMENT,
            "uptime": time.time(),
            "prometheus": {"enabled": False},
        }


@app.get("/sentry-debug")
async def trigger_error():
    """Sentry debug endpoint to verify installation"""
    # This will trigger an error that Sentry will capture
    division_by_zero = 1 / 0  # noqa: F841


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
