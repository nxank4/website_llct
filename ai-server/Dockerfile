FROM python:3.12-slim AS base
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install uv for faster package installation
RUN pip install --no-cache-dir uv

# Copy dependency files first (for better Docker layer caching)
# This layer will only rebuild when dependencies change
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync
# --frozen ensures exact versions from uv.lock
RUN uv sync --frozen

# Copy application code and helper scripts
# This layer will rebuild when code changes, but dependencies layer stays cached
COPY app ./app
COPY scripts ./scripts

# Ensure helper scripts are executable (used for deployment/local dev)
RUN chmod +x ./scripts/deploy.sh \
    ./scripts/run_local.sh

EXPOSE 8080
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]


