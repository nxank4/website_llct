#!/usr/bin/env bash
set -euo pipefail

# Simple runner for FastAPI server (SQL/Redis)
# Usage:
#   bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-install]
# Env:
#   SKIP_PIP_INSTALL=1   # alternative to --no-install

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="8000"
HOST="0.0.0.0"
RELOAD=""
DO_INSTALL=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="${2:-8000}"; shift 2 ;;
    --host)
      HOST="${2:-0.0.0.0}"; shift 2 ;;
    --reload)
      RELOAD="--reload"; shift ;;
    --no-install)
      DO_INSTALL=0; shift ;;
    -h|--help)
      echo "Usage: bash run_server.sh [--port 8000] [--host 0.0.0.0] [--reload] [--no-install]";
      exit 0 ;;
    *)
      echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# 1) Ensure virtualenv
if [[ ! -d .venv ]]; then
  echo "[setup] Creating virtualenv .venv"
  python -m venv .venv
fi

# 2) Activate virtualenv (Windows Git Bash or Unix)
if [[ -f .venv/Scripts/activate ]]; then
  # Windows (Git Bash)
  # shellcheck disable=SC1091
  source .venv/Scripts/activate
elif [[ -f .venv/bin/activate ]]; then
  # Unix
  # shellcheck disable=SC1091
  source .venv/bin/activate
else
  echo "[error] Cannot find venv activation script"; exit 1
fi

# 3) Install dependencies
if [[ ${SKIP_PIP_INSTALL:-0} -eq 1 ]]; then
  DO_INSTALL=0
fi
if [[ $DO_INSTALL -eq 1 ]]; then
  echo "[setup] Installing requirements"
  pip install --upgrade pip >/dev/null
  pip install -r requirements.txt
fi

# 4) Ensure .env exists
if [[ ! -f .env ]]; then
  echo "[setup] Creating .env from env.example"
  cp env.example .env || true
fi

# 5) Choose app entry
APP="app.main:app"

# 6) Helpful warnings
if ! grep -q '^GEMINI_API_KEY=' .env 2>/dev/null; then
  echo "[warn] GEMINI_API_KEY is not set in .env (AI features may be disabled)"
fi

echo "[run] uvicorn $APP --host $HOST --port $PORT $RELOAD"
python -m uvicorn "$APP" --host "$HOST" --port "$PORT" ${RELOAD}


