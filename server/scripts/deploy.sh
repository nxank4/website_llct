#!/usr/bin/env bash
set -euo pipefail

# Production start script for Docker/Render
# This script runs database migrations and starts the Gunicorn server

echo "[start] Starting FastAPI server in production mode..."

# Debug: Check current directory and file structure
echo "[debug] Current directory: $(pwd)"
echo "[debug] Contents of /app:"
ls -la /app | head -20 || echo "[debug] Cannot list /app"
echo "[debug] Checking for app directory:"
ls -la /app/app 2>/dev/null | head -10 || echo "[debug] /app/app not found"
echo "[debug] Checking for alembic directory:"
ls -la /app/alembic 2>/dev/null | head -10 || echo "[debug] /app/alembic not found"

# Activate virtual environment created by uv sync
# uv sync creates .venv in the current directory
if [[ -f .venv/bin/activate ]]; then
  echo "[setup] Activating virtual environment..."
  source .venv/bin/activate
  # Re-export PYTHONPATH after activation (activate script may unset it)
  # This ensures Python can find the app module in /app
  export PYTHONPATH=/app
  echo "[setup] PYTHONPATH set to: ${PYTHONPATH}"
else
  echo "[warn] Virtual environment not found, using system Python..."
  # Ensure PYTHONPATH is set even without virtual environment
  export PYTHONPATH=/app
  echo "[setup] PYTHONPATH set to: ${PYTHONPATH}"
fi

# Debug: Verify PYTHONPATH is set
echo "[debug] PYTHONPATH=${PYTHONPATH}"
echo "[debug] Python path:"
python -c "import sys; print('\n'.join(sys.path))" || echo "[debug] Cannot run Python"

# 1. Run database migrations (if alembic exists)
if [[ -f alembic.ini ]] && [[ -d alembic ]]; then
  echo "[migrate] Running database migrations..."
  alembic upgrade head || {
    echo "[warn] Migration failed, continuing anyway..."
  }
else
  echo "[info] No Alembic migrations found, skipping..."
fi

# 2. Start Gunicorn server
# Render automatically sets PORT environment variable
PORT="${PORT:-10000}"
HOST="${HOST:-0.0.0.0}"
APP="app.main:app"

echo "[start] Starting Gunicorn server on ${HOST}:${PORT}..."
echo "[start] PYTHONPATH=${PYTHONPATH}"
echo "[start] gunicorn -w 4 -k uvicorn.workers.UvicornWorker ${APP} --bind ${HOST}:${PORT} --log-level info"

# Use exec to replace shell process with Gunicorn (for proper signal handling)
# Ensure PYTHONPATH is passed to gunicorn process
exec env PYTHONPATH=/app gunicorn \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  "${APP}" \
  --bind "${HOST}:${PORT}" \
  --log-level info \
  --access-logfile - \
  --error-logfile -

