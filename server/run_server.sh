#!/usr/bin/env bash
set -euo pipefail

# Simple runner for FastAPI server using uv
# Usage:
#   bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-sync]
# Env:
#   SKIP_SYNC=1   # alternative to --no-sync

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="8000"
HOST="0.0.0.0"
RELOAD=""
DO_SYNC=1

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
    -h|--help)
      echo "Usage: bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-sync]";
      exit 0 ;;
    *)
      echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# 1) Check if uv is installed
if ! command -v uv &> /dev/null; then
  echo "[error] uv is not installed. Please install it first:"
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
  echo "  or: pip install uv"
  exit 1
fi

# 2) Sync dependencies
if [[ ${SKIP_SYNC:-0} -eq 1 ]]; then
  DO_SYNC=0
fi
if [[ $DO_SYNC -eq 1 ]]; then
  echo "[setup] Syncing dependencies with uv"
  uv sync
fi

# 3) Ensure .env exists
if [[ ! -f .env ]]; then
  echo "[setup] Creating .env from env.example"
  cp env.example .env || true
fi

# 4) Choose app entry
APP="app.main:app"

# 5) Helpful warnings
if ! grep -q '^GEMINI_API_KEY=' .env 2>/dev/null; then
  echo "[warn] GEMINI_API_KEY is not set in .env (AI features may be disabled)"
fi

echo "[run] uv run uvicorn $APP --host $HOST --port $PORT $RELOAD"
uv run uvicorn "$APP" --host "$HOST" --port "$PORT" ${RELOAD}