#!/usr/bin/env bash
set -euo pipefail

# FastAPI server runner - supports both development and production (Render)
# Usage:
#   bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-sync] [--no-migrate]
# Env:
#   SKIP_SYNC=1        # alternative to --no-sync
#   SKIP_MIGRATE=1     # alternative to --no-migrate
#   ENVIRONMENT        # production or development (default: auto-detect)
#   PORT               # port to bind (default: 8000, Render sets this automatically)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"
RELOAD=""
DO_SYNC=1
DO_MIGRATE=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="${2:-8000}"; shift 2 ;;
    --host)
      HOST="${2:-0.0.0.0}"; shift 2 ;;
    --reload)
      RELOAD="--reload"; shift ;;
    --no-sync)
      DO_SYNC=0; shift ;;
    --no-migrate)
      DO_MIGRATE=0; shift ;;
    -h|--help)
      echo "Usage: bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-sync] [--no-migrate]";
      echo "Env: SKIP_SYNC=1, SKIP_MIGRATE=1, ENVIRONMENT, PORT";
      exit 0 ;;
    *)
      echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Detect environment (production if PORT is set by Render or ENVIRONMENT=production)
if [[ -z "${ENVIRONMENT:-}" ]]; then
  # Render automatically sets PORT, so if PORT is not default, assume production
  if [[ "${PORT:-8000}" != "8000" ]] || [[ -n "${RENDER:-}" ]]; then
    ENVIRONMENT="production"
  else
    ENVIRONMENT="development"
  fi
fi

# 1) Check if uv is installed (needed for both development and production)
if ! command -v uv &> /dev/null; then
  echo "[error] uv is not installed. Please install it first:"
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
  echo "  or: pip install uv"
  exit 1
fi

# 2) Sync dependencies (development only, Render handles this in build step)
if [[ ${SKIP_SYNC:-0} -eq 1 ]]; then
  DO_SYNC=0
fi
if [[ $DO_SYNC -eq 1 ]] && [[ "${ENVIRONMENT}" != "production" ]]; then
  echo "[setup] Syncing dependencies with uv"
  uv sync
fi

# 3) Ensure .env exists (development only)
if [[ "${ENVIRONMENT}" != "production" ]]; then
  if [[ ! -f .env ]]; then
    echo "[setup] Creating .env from env.example"
    cp env.example .env || true
  fi
fi

# 4) Run database migrations (if enabled and alembic exists)
if [[ ${SKIP_MIGRATE:-0} -eq 1 ]]; then
  DO_MIGRATE=0
fi
if [[ $DO_MIGRATE -eq 1 ]] && [[ -f alembic.ini ]] && [[ -d alembic ]]; then
  echo "[migrate] Running database migrations..."
  uv run alembic upgrade head || echo "[warn] Migration failed, continuing anyway..."
fi

# 5) Choose app entry
APP="app.main:app"

# 6) Helpful warnings (development only)
if [[ "${ENVIRONMENT}" != "production" ]]; then
  if [[ -f .env ]] && ! grep -q '^GEMINI_API_KEY=' .env 2>/dev/null; then
    echo "[warn] GEMINI_API_KEY is not set in .env (AI features may be disabled)"
  fi
fi

# 7) Start server
if [[ "${ENVIRONMENT}" == "production" ]]; then
  # Production: Use Gunicorn with Uvicorn workers (for Render)
  echo "[run] Starting Gunicorn server (production mode)..."
  echo "[run] uv run gunicorn -w 4 -k uvicorn.workers.UvicornWorker $APP --bind $HOST:$PORT --log-level info"
  exec uv run gunicorn -w 4 -k uvicorn.workers.UvicornWorker "$APP" --bind "$HOST:$PORT" --log-level info
else
  # Development: Use Uvicorn with reload
  echo "[run] Starting Uvicorn server (development mode)..."
  echo "[run] uv run uvicorn $APP --host $HOST --port $PORT $RELOAD"
  uv run uvicorn "$APP" --host "$HOST" --port "$PORT" ${RELOAD}
fi