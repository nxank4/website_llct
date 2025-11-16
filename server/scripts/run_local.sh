#!/usr/bin/env bash
set -euo pipefail

# FastAPI server runner - supports both development and production (Render)
# Usage:
#   bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-sync] [--no-migrate] [--gunicorn] [--workers N]
# Env:
#   SKIP_SYNC=1        # alternative to --no-sync
#   SKIP_MIGRATE=1     # alternative to --no-migrate
#   ENVIRONMENT        # production or development (default: auto-detect)
#   PORT               # port to bind (default: 8000, Render sets this automatically)
#   WORKERS            # number of gunicorn workers (default: 2 for dev, 4 for prod)

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
USE_GUNICORN=0
WORKERS="${WORKERS:-}"

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
    --gunicorn)
      USE_GUNICORN=1; shift ;;
    --workers)
      WORKERS="${2:-2}"; USE_GUNICORN=1; shift 2 ;;
    -h|--help)
      echo -e "${GREEN}Usage:${NC} bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-sync] [--no-migrate] [--gunicorn] [--workers N]"
      echo -e "${GREEN}Env:${NC} SKIP_SYNC=1, SKIP_MIGRATE=1, ENVIRONMENT, PORT, WORKERS"
      echo ""
      echo -e "${BLUE}Options:${NC}"
      echo "  --gunicorn     Use Gunicorn with Uvicorn workers (for testing multi-worker behavior)"
      echo "  --workers N    Number of Gunicorn workers (implies --gunicorn, default: 2 for dev, 4 for prod)"
      echo ""
      echo -e "${YELLOW}Note:${NC} --reload is not compatible with --gunicorn (Gunicorn doesn't support auto-reload)"
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

# Health check function
check_health() {
  local max_attempts=30
  local attempt=0
  local health_url="http://${HOST}:${PORT}/health"
  
  # Replace 0.0.0.0 with localhost for curl
  if [[ "$HOST" == "0.0.0.0" ]]; then
    health_url="http://localhost:${PORT}/health"
  fi
  
  echo -e "${BLUE}🔍 Checking server health...${NC}"
  
  while [ $attempt -lt $max_attempts ]; do
    if curl -s -f -o /dev/null "$health_url" 2>/dev/null; then
      echo -e "${GREEN}✅ Health check passed! Server is ready.${NC}"
      return 0
    fi
    attempt=$((attempt + 1))
    if [ $attempt -lt $max_attempts ]; then
      echo -e "${YELLOW}⏳ Waiting for server... (${attempt}/${max_attempts})${NC}"
      sleep 1
    fi
  done
  
  echo -e "${RED}❌ Health check failed after ${max_attempts} attempts${NC}"
  echo -e "${YELLOW}   Server may not be responding at ${health_url}${NC}"
  return 1
}

# 6) Helpful warnings (development only)
if [[ "${ENVIRONMENT}" != "production" ]]; then
  if [[ -f .env ]] && ! grep -q '^GEMINI_API_KEY=' .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  GEMINI_API_KEY is not set in .env (AI features may be disabled)${NC}"
  fi
fi

# 7) Start server
if [[ "${ENVIRONMENT}" == "production" ]]; then
  # Production: Use Gunicorn with Uvicorn workers (for Render)
  WORKERS="${WORKERS:-4}"
  echo -e "${GREEN}🚀 Starting Gunicorn server (production mode)...${NC}"
  echo -e "${BLUE}📦 Command:${NC} uv run gunicorn -w ${WORKERS} -k uvicorn.workers.UvicornWorker $APP --bind $HOST:$PORT --log-level info"
  exec uv run gunicorn -w "${WORKERS}" -k uvicorn.workers.UvicornWorker "$APP" --bind "$HOST:$PORT" --log-level info --timeout 120 --graceful-timeout 30 --keep-alive 5
else
  # Development: Choose between Uvicorn or Gunicorn
  if [[ $USE_GUNICORN -eq 1 ]]; then
    # Development with Gunicorn (for testing multi-worker behavior)
    WORKERS="${WORKERS:-2}"
    if [[ -n "$RELOAD" ]]; then
      echo -e "${YELLOW}⚠️  Warning: --reload is not compatible with Gunicorn. Auto-reload disabled.${NC}"
      echo -e "${YELLOW}   Use 'uvicorn --reload' for development with auto-reload.${NC}"
    fi
    echo -e "${GREEN}🚀 Starting Gunicorn server (development mode with ${WORKERS} workers)...${NC}"
    echo -e "${BLUE}📦 Command:${NC} uv run gunicorn -w ${WORKERS} -k uvicorn.workers.UvicornWorker $APP --bind $HOST:$PORT --log-level debug --reload"
    echo -e "${GREEN}✅ Server running on http://localhost:${PORT}${NC}"
    echo -e "${GREEN}📚 API Docs: http://localhost:${PORT}/docs${NC}"
    echo -e "${GREEN}📖 ReDoc: http://localhost:${PORT}/redoc${NC}"
    echo -e "${GREEN}❤️  Health: http://localhost:${PORT}/health${NC}"
    echo -e "${YELLOW}💡 Note: Gunicorn with ${WORKERS} workers - good for testing concurrent behavior${NC}"
    echo ""
    # Use --reload flag for Gunicorn (it does support reload, but only for single worker in dev)
    if [[ "${WORKERS}" == "1" ]] && [[ -n "$RELOAD" ]]; then
      # Start in background for health check
      uv run gunicorn -w 1 -k uvicorn.workers.UvicornWorker "$APP" --bind "$HOST:$PORT" --log-level debug --reload > /tmp/gunicorn.log 2>&1 &
      SERVER_PID=$!
      sleep 3
      if check_health; then
        echo -e "${GREEN}✅ Server started successfully!${NC}"
        echo -e "${BLUE}📋 Server logs:${NC}"
        tail -f /tmp/gunicorn.log &
        TAIL_PID=$!
        wait $SERVER_PID
        kill $TAIL_PID 2>/dev/null || true
      else
        echo -e "${RED}❌ Server failed to start properly${NC}"
        tail -20 /tmp/gunicorn.log || true
        kill $SERVER_PID 2>/dev/null || true
        exit 1
      fi
    else
      # Start in background for health check
      uv run gunicorn -w "${WORKERS}" -k uvicorn.workers.UvicornWorker "$APP" --bind "$HOST:$PORT" --log-level debug --timeout 120 --graceful-timeout 30 --keep-alive 5 > /tmp/gunicorn.log 2>&1 &
      SERVER_PID=$!
      sleep 3
      if check_health; then
        echo -e "${GREEN}✅ Server started successfully with ${WORKERS} workers!${NC}"
        echo -e "${BLUE}📋 Server logs:${NC}"
        tail -f /tmp/gunicorn.log &
        TAIL_PID=$!
        wait $SERVER_PID
        kill $TAIL_PID 2>/dev/null || true
      else
        echo -e "${RED}❌ Server failed to start properly${NC}"
        tail -20 /tmp/gunicorn.log || true
        kill $SERVER_PID 2>/dev/null || true
        exit 1
      fi
    fi
  else
    # Development: Use Uvicorn with reload (default)
  if [[ -n "$RELOAD" ]]; then
    echo -e "${GREEN}🔄 Running with auto-reload enabled${NC}"
  fi
  echo -e "${GREEN}🚀 Starting FastAPI server (development mode)...${NC}"
    echo -e "${GREEN}✅ Server will run on http://localhost:${PORT}${NC}"
  echo -e "${GREEN}📚 API Docs: http://localhost:${PORT}/docs${NC}"
  echo -e "${GREEN}📖 ReDoc: http://localhost:${PORT}/redoc${NC}"
  echo -e "${GREEN}❤️  Health: http://localhost:${PORT}/health${NC}"
    echo -e "${YELLOW}💡 Tip: Use --gunicorn --workers N to test multi-worker behavior${NC}"
  echo ""
    
    # Start server in background for health check (only if not reload mode)
    if [[ -z "$RELOAD" ]]; then
      # Start server in background
      uv run uvicorn "$APP" --host "$HOST" --port "$PORT" > /tmp/uvicorn.log 2>&1 &
      SERVER_PID=$!
      
      # Wait a bit for server to start
      sleep 2
      
      # Check health
      if check_health; then
        echo -e "${GREEN}✅ Server started successfully!${NC}"
        echo -e "${BLUE}📋 Server logs:${NC}"
        tail -f /tmp/uvicorn.log &
        TAIL_PID=$!
        # Wait for server process
        wait $SERVER_PID
        kill $TAIL_PID 2>/dev/null || true
      else
        echo -e "${RED}❌ Server failed to start properly${NC}"
        echo -e "${YELLOW}📋 Last server logs:${NC}"
        tail -20 /tmp/uvicorn.log || true
        kill $SERVER_PID 2>/dev/null || true
        exit 1
      fi
    else
      # With reload, just run normally (reload doesn't work well with background)
  uv run uvicorn "$APP" --host "$HOST" --port "$PORT" ${RELOAD}
    fi
  fi
fi