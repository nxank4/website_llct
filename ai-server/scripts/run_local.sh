#!/bin/bash

# Script chạy AI Server local để test
# Sử dụng: bash run_local.sh [--reload]

set -e

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AI Server (Local Development)...${NC}"

# Kiểm tra uv đã cài đặt chưa
if ! command -v uv &> /dev/null; then
    echo -e "${RED}❌ Error: uv is not installed.${NC}"
    echo -e "${YELLOW}Please install it first:${NC}"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "  or: pip install uv"
    exit 1
fi

# Unset VIRTUAL_ENV để tránh conflict với uv
# uv sẽ tự quản lý virtual environment trong .venv của project
if [ -n "${VIRTUAL_ENV:-}" ]; then
    CURRENT_DIR=$(pwd)
    if [[ "$VIRTUAL_ENV" != "$CURRENT_DIR/.venv"* ]]; then
        echo -e "${YELLOW}⚠️  Unsetting VIRTUAL_ENV from other project ($VIRTUAL_ENV)...${NC}"
        unset VIRTUAL_ENV
    fi
fi

# Kiểm tra file .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found. Creating from env.example...${NC}"
    if [ -f env.example ]; then
        cp env.example .env
        echo -e "${YELLOW}⚠️  Please update .env with your actual values!${NC}"
    else
        echo -e "${YELLOW}⚠️  env.example not found. Please create .env manually.${NC}"
    fi
fi

# Install dependencies với uv
echo -e "${GREEN}📥 Syncing dependencies with uv...${NC}"
uv sync

# Set environment variables for local
export ENVIRONMENT=development
export LOG_LEVEL=DEBUG

# Chạy server với uvicorn
# AI Server uses port 8001 to avoid conflict with backend server (port 8000)
PORT=${PORT:-8001}
RELOAD_FLAG=""

if [[ "$1" == "--reload" ]]; then
    RELOAD_FLAG="--reload"
    echo -e "${GREEN}🔄 Running with auto-reload enabled${NC}"
fi

echo -e "${GREEN}✅ Starting server on http://localhost:${PORT}${NC}"
echo -e "${GREEN}📚 API Docs: http://localhost:${PORT}/docs${NC}"
echo -e "${GREEN}❤️  Health: http://localhost:${PORT}/health${NC}"
echo ""

uv run uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT} \
    ${RELOAD_FLAG}

