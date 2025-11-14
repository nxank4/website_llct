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

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine project root (one level up from scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT_DIR"

# Backend server uses port 8000 to avoid conflict with AI server (port 8001)
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
      echo -e "${GREEN}Usage:${NC} bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-sync] [--no-migrate]"
      echo -e "${GREEN}Env:${NC} SKIP_SYNC=1, SKIP_MIGRATE=1, ENVIRONMENT, PORT"
      exit 0 ;;
    *)
      echo -e "${RED}❌ Unknown arg: $1${NC}"
      exit 1 ;;
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

# Display startup message
if [[ "${ENVIRONMENT}" == "production" ]]; then
  echo -e "${GREEN}🚀 Starting FastAPI Backend Server (Production Mode)...${NC}"
else
  echo -e "${GREEN}🚀 Starting FastAPI Backend Server (Local Development)...${NC}"
fi

# 1) Check if uv is installed (needed for both development and production)
if ! command -v uv &> /dev/null; then
  echo -e "${RED}❌ Error: uv is not installed.${NC}"
  echo -e "${YELLOW}Please install it first:${NC}"
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
  echo "  or: pip install uv"
  exit 1
fi

# 2) Sync dependencies (development only, Render handles this in build step)
if [[ ${SKIP_SYNC:-0} -eq 1 ]]; then
  DO_SYNC=0
fi
if [[ $DO_SYNC -eq 1 ]] && [[ "${ENVIRONMENT}" != "production" ]]; then
  echo -e "${GREEN}📥 Syncing dependencies with uv...${NC}"
  uv sync
fi

# 3) Ensure .env exists (development only)
if [[ "${ENVIRONMENT}" != "production" ]]; then
  if [[ ! -f .env ]]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found. Creating from env.example...${NC}"
    if [[ -f env.example ]]; then
      cp env.example .env
      echo -e "${YELLOW}⚠️  Please update .env with your actual values!${NC}"
    else
      echo -e "${YELLOW}⚠️  env.example not found. Please create .env manually.${NC}"
    fi
  fi
fi

# 4) Run database migrations (if enabled and alembic exists)
if [[ ${SKIP_MIGRATE:-0} -eq 1 ]]; then
  DO_MIGRATE=0
fi
if [[ $DO_MIGRATE -eq 1 ]] && [[ -f alembic.ini ]] && [[ -d alembic ]]; then
  echo -e "${GREEN}🔄 Running database migrations...${NC}"
  if uv run alembic upgrade head; then
    echo -e "${GREEN}✅ Migrations completed successfully${NC}"
  else
    echo -e "${YELLOW}⚠️  Migration failed, continuing anyway...${NC}"
  fi
fi

# 5) Choose app entry
APP="app.main:app"

# 6) Helpful warnings (development only)
if [[ "${ENVIRONMENT}" != "production" ]]; then
  if [[ -f .env ]] && ! grep -q '^GEMINI_API_KEY=' .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  GEMINI_API_KEY is not set in .env (AI features may be disabled)${NC}"
  fi
fi

# 7) Start server
if [[ "${ENVIRONMENT}" == "production" ]]; then
  # Production: Use Gunicorn with Uvicorn workers (for Render)
  echo -e "${GREEN}🚀 Starting Gunicorn server (production mode)...${NC}"
  echo -e "${BLUE}📦 Command:${NC} uv run gunicorn -w 4 -k uvicorn.workers.UvicornWorker $APP --bind $HOST:$PORT --log-level info"
  exec uv run gunicorn -w 4 -k uvicorn.workers.UvicornWorker "$APP" --bind "$HOST:$PORT" --log-level info
else
  # Development: Use Uvicorn with reload
  if [[ -n "$RELOAD" ]]; then
    echo -e "${GREEN}🔄 Running with auto-reload enabled${NC}"
  fi
  echo -e "${GREEN}🚀 Starting FastAPI server (development mode)...${NC}"
  echo -e "${GREEN}✅ Server running on http://localhost:${PORT}${NC}"
  echo -e "${GREEN}📚 API Docs: http://localhost:${PORT}/docs${NC}"
  echo -e "${GREEN}📖 ReDoc: http://localhost:${PORT}/redoc${NC}"
  echo -e "${GREEN}❤️  Health: http://localhost:${PORT}/health${NC}"
  echo ""
  uv run uvicorn "$APP" --host "$HOST" --port "$PORT" ${RELOAD}
fi