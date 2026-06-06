#!/usr/bin/env bash
set -euo pipefail

# Resolve script directory (repo root)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create/use the repo virtualenv so backend dependencies are available
if [[ ! -x "$SCRIPT_DIR/.venv/bin/python" ]]; then
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 was not found and .venv/bin/python is missing."
    exit 1
  fi
  echo "Creating Python virtual environment..."
  python3 -m venv "$SCRIPT_DIR/.venv"
fi

PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python"

echo "Installing backend dependencies..."
"$PYTHON_BIN" -m pip install -r "$SCRIPT_DIR/backend/requirements.txt"

backend_health_ready() {
  "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import json
from urllib.request import urlopen

with urlopen("http://127.0.0.1:5000/health", timeout=1) as response:
    payload = json.load(response)

if not payload.get("modelLoaded"):
    raise SystemExit(1)
PY
}

# Start backend (Flask) in background
BACKEND_PID=""
if backend_health_ready; then
  echo "Backend is already running and model.pkl is loaded."
else
  echo "Starting backend (Flask)..."
  cd "$SCRIPT_DIR/backend"
  # Use unbuffered output; run in background so we can start the frontend
  FLASK_DEBUG=0 "$PYTHON_BIN" -u app.py &
  BACKEND_PID=$!

  echo "Backend started with PID $BACKEND_PID"
fi

# Ensure backend is stopped when this script exits
cleanup() {
  if [[ -n "$BACKEND_PID" ]]; then
    echo "Stopping backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Wait until the backend Python server is reachable and model.pkl is loaded
echo "Waiting for backend to become ready on 127.0.0.1:5000..."
for _ in $(seq 1 60); do
  if [[ -n "$BACKEND_PID" ]] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Backend exited before it became ready."
    exit 1
  fi

  if backend_health_ready; then
    echo "Backend is ready and model.pkl is loaded."
    break
  fi

  sleep 1
done

if ! backend_health_ready; then
  echo "Timed out waiting for backend readiness or model.pkl loading."
  exit 1
fi

# Start frontend (Vite) in foreground so logs are visible in this terminal
echo "Starting frontend (Vite)..."
cd "$SCRIPT_DIR/frontend"
npm run dev

# When npm exits, the trap will run and backend will be stopped
