#!/bin/bash

# Script để kill process đang sử dụng port 8000 hoặc 8001
# Sử dụng: bash kill_port.sh [8000|8001]

set -e

PORT="${1:-8001}"

echo "🔍 Checking for processes using port ${PORT}..."

# Windows: Find process using port
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]] || [[ -n "${WINDIR:-}" ]]; then
    # Windows
    PID=$(netstat -ano | grep ":${PORT}" | grep LISTENING | awk '{print $5}' | head -1)
    
    if [ -z "$PID" ]; then
        echo "✅ No process found using port ${PORT}"
        exit 0
    fi
    
    echo "⚠️  Found process ${PID} using port ${PORT}"
    echo "📋 Process details:"
    tasklist /FI "PID eq ${PID}" /FO LIST
    
    read -p "Kill process ${PID}? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 Killing process ${PID}..."
        taskkill /PID "${PID}" /F
        echo "✅ Process ${PID} killed"
    else
        echo "❌ Cancelled"
        exit 1
    fi
else
    # Linux/Mac
    PID=$(lsof -ti:${PORT} 2>/dev/null || echo "")
    
    if [ -z "$PID" ]; then
        echo "✅ No process found using port ${PORT}"
        exit 0
    fi
    
    echo "⚠️  Found process ${PID} using port ${PORT}"
    echo "📋 Process details:"
    ps -p "${PID}" -o pid,cmd
    
    read -p "Kill process ${PID}? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 Killing process ${PID}..."
        kill -9 "${PID}"
        echo "✅ Process ${PID} killed"
    else
        echo "❌ Cancelled"
        exit 1
    fi
fi

