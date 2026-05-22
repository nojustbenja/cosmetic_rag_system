#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
BACKEND_VENV="$BACKEND_DIR/.venv-run"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

port_in_use() {
  lsof -i "tcp:$1" -sTCP:LISTEN -t >/dev/null 2>&1
}


require_command python3
require_command lsof

if [[ ! -d "$BACKEND_VENV" ]]; then
  echo "Creating backend virtualenv..."
  python3 -m venv "$BACKEND_VENV"
fi

if [[ ! -x "$BACKEND_VENV/bin/uvicorn" ]]; then
  echo "Installing backend dependencies..."
  "$BACKEND_VENV/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

if port_in_use "$BACKEND_PORT"; then
  echo "Backend port $BACKEND_PORT is already in use."
  echo "Stop the existing process or run with BACKEND_PORT=8001 ./start-backend.sh"
  exit 1
fi

echo "Starting backend on http://127.0.0.1:$BACKEND_PORT"
cd "$BACKEND_DIR"
exec "$BACKEND_VENV/bin/uvicorn" api.main:app --port "$BACKEND_PORT"
