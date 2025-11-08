# Dockerfile for Render deployment
# Multi-stage build for optimized image size

FROM python:3.12-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Create working directory
WORKDIR /app

# Install uv for faster package installation
RUN pip install --no-cache-dir uv

# Copy and install dependencies
# (Separate these steps to leverage Docker layer caching)
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# Copy application code
COPY . .

# Make start script executable
RUN chmod +x ./start.sh

# Expose port (Render will set PORT environment variable)
EXPOSE ${PORT:-10000}

# Use start.sh to run migrations and start server
CMD ["./start.sh"]
