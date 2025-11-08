import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment variable (Render sets this)
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    environment = os.getenv("ENVIRONMENT", "production")

    # Use gunicorn in production, uvicorn in development
    if environment == "production":
        # Gunicorn will be called from command line
        # This is just a fallback for direct Python execution
        import sys

        print(
            "For production, use: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:PORT"
        )
        sys.exit(1)
    else:
        # Development: use uvicorn with reload
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            log_level=os.getenv("LOG_LEVEL", "info").lower(),
            reload=True,
        )
