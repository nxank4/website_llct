#!/usr/bin/env bash
set -euo pipefail

# Production start script for Docker/Render
# This script runs database migrations and starts the Gunicorn server

echo "[start] Starting FastAPI server in production mode..."

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
echo "[start] gunicorn -w 4 -k uvicorn.workers.UvicornWorker ${APP} --bind ${HOST}:${PORT} --log-level info"

# Use exec to replace shell process with Gunicorn (for proper signal handling)
exec gunicorn \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  "${APP}" \
  --bind "${HOST}:${PORT}" \
  --log-level info \
  --access-logfile - \
  --error-logfile -

