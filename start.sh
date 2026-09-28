#!/usr/bin/env bash

# ChurnGuard AI - 1-Command Startup Script
# Automatically boots FastAPI backend and launches modern Web UI in browser

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo " 🚀 Starting ChurnGuard AI Ecosystem"
echo "============================================================"

# 1. Check Python virtual environment
VENV_PYTHON=""
if [ -f ".venv/bin/python" ]; then
    VENV_PYTHON=".venv/bin/python"
    UVICORN=".venv/bin/uvicorn"
elif command -v python3 &> /dev/null; then
    VENV_PYTHON="python3"
    UVICORN="uvicorn"
else
    echo "❌ Error: Python 3 not found. Please install Python or activate venv."
    exit 1
fi

echo "✅ Using Python: $($VENV_PYTHON --version)"

# 2. Start FastAPI Backend in background
echo "⚡ Starting FastAPI Server on http://localhost:8000 ..."
$UVICORN api.app:app --port 8000 --log-level info &
API_PID=$!

# Ensure backend stops when this script exits
cleanup() {
    echo ""
    echo "🛑 Shutting down FastAPI server (PID: $API_PID)..."
    kill $API_PID 2>/dev/null || true
    echo "👋 ChurnGuard AI stopped. Goodbye!"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 3. Wait a moment for server to initialize
sleep 1.5

# 4. Open Web UI in browser
echo "🌐 Launching Web UI in browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open web/index.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open web/index.html 2>/dev/null || sensible-browser web/index.html 2>/dev/null || true
fi

echo ""
echo "============================================================"
echo " 🎉 Everything is UP and RUNNING!"
echo " 💻 Web UI Dashboard:      file://$DIR/web/index.html"
echo " 📚 Swagger API Docs:      http://localhost:8000/docs"
echo " 🩺 Health Check:          http://localhost:8000/health"
echo "============================================================"
echo "Press Ctrl + C in this terminal anytime to stop the server."
echo ""

# Keep running until Ctrl+C
wait $API_PID
