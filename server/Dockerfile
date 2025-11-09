# Dockerfile for Render deployment
# Uses pyproject.toml and uv.lock for modern, optimized builds

FROM python:3.12-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set PYTHONPATH to /app so Python can find the app module
# This ensures "app.main:app" can be imported correctly
ENV PYTHONPATH=/app

# Create working directory
WORKDIR /app

# Install uv for faster package installation
RUN pip install --no-cache-dir uv

# Copy dependency files first (for better Docker layer caching)
# This layer will only rebuild when dependencies change
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync (reads from pyproject.toml and uv.lock)
# --frozen ensures exact versions from uv.lock
# Note: uv sync automatically installs to the current environment (system Python in Docker)
RUN uv sync --frozen

# Copy application code
# This layer will rebuild when code changes, but dependencies layer stays cached
COPY . .

# Debug: List all files and directories to verify app/ is copied
RUN ls -la /app && echo "---" && ls -la /app/app 2>/dev/null || echo "app/ directory not found"

# Make start script executable
RUN chmod +x ./start_render.sh

# Expose port (Render will set PORT environment variable)
EXPOSE ${PORT:-10000}

# Use start_render.sh to run migrations and start server
CMD ["./start_render.sh"]
