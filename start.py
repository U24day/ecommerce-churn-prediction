#!/usr/bin/env python3
"""
ChurnGuard AI - 1-Command Cross-Platform Launcher
Runs FastAPI backend and automatically opens the Web UI in your browser.
"""

import os
import sys
import time
import signal
import subprocess
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

def main():
    print("=" * 60)
    print(" 🚀 Starting ChurnGuard AI Ecosystem")
    print("=" * 60)

    # Determine uvicorn command
    venv_uvicorn = ROOT_DIR / ".venv" / "bin" / "uvicorn"
    if venv_uvicorn.exists():
        uvicorn_cmd = [str(venv_uvicorn), "api.app:app", "--port", "8000"]
    else:
        uvicorn_cmd = [sys.executable, "-m", "uvicorn", "api.app:app", "--port", "8000"]

    print("⚡ Starting FastAPI Server on http://localhost:8000 ...")
    server_process = subprocess.Popen(uvicorn_cmd, cwd=str(ROOT_DIR))

    def shutdown(sig, frame):
        print("\n🛑 Stopping FastAPI Server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            server_process.kill()
        print("👋 ChurnGuard AI stopped. Goodbye!")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Wait for server startup
    time.sleep(1.5)

    # Open Web UI
    index_file = ROOT_DIR / "web" / "index.html"
    print(f"🌐 Opening Web UI in browser ({index_file.as_uri()}) ...")
    webbrowser.open(index_file.as_uri())

    print("\n" + "=" * 60)
    print(" 🎉 Everything is UP and RUNNING!")
    print(f" 💻 Web UI Dashboard:   {index_file.as_uri()}")
    print(" 📚 Swagger API Docs:   http://localhost:8000/docs")
    print(" 🩺 Health Check:       http://localhost:8000/health")
    print("=" * 60)
    print("Press Ctrl + C anytime in this terminal to stop the server.\n")

    try:
        server_process.wait()
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    main()
