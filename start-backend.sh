#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BACKEND_PORT="${BACKEND_PORT:-8000}"

is_usable_venv() {
  local venv_path="$1"
  [[ -x "$venv_path/bin/python" ]] || [[ -x "$venv_path/bin/python3" ]]
}

# Prefer a working runtime venv. Some copied/moved checkouts keep a stale
# .venv whose console scripts point at the old absolute path.
if [[ -d "$BACKEND_DIR/.venv-run" ]] && is_usable_venv "$BACKEND_DIR/.venv-run"; then
  BACKEND_VENV="$BACKEND_DIR/.venv-run"
elif [[ -d "$BACKEND_DIR/.venv" ]] && is_usable_venv "$BACKEND_DIR/.venv"; then
  BACKEND_VENV="$BACKEND_DIR/.venv"
else
  BACKEND_VENV="$BACKEND_DIR/.venv-run"
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Missing required command: $1"
    exit 1
  fi
}

port_in_use() {
  lsof -i "tcp:$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

require_command python3
require_command lsof

if [[ ! -f "$BACKEND_DIR/.env" ]] && [[ -f "$BACKEND_DIR/.env.example" ]]; then
  echo "⚠️  .env file not found. Creating from .env.example..."
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "💡 Please edit backend/.env with your API keys."
fi

if ! is_usable_venv "$BACKEND_VENV"; then
  echo "📦 Creating backend virtualenv in $BACKEND_VENV..."
  python3 -m venv "$BACKEND_VENV"
fi

if [[ ! -x "$BACKEND_VENV/bin/uvicorn" ]] || ! "$BACKEND_VENV/bin/python" -c "import uvicorn" >/dev/null 2>&1; then
  echo "📥 Installing backend dependencies..."
  "$BACKEND_VENV/bin/pip" install --quiet -r "$BACKEND_DIR/requirements.txt"
fi

if port_in_use "$BACKEND_PORT"; then
  echo "🚫 Backend port $BACKEND_PORT is already in use."
  echo "   Stop the existing process or run with: BACKEND_PORT=8001 ./start-backend.sh"
  exit 1
fi

echo "🚀 Starting backend on http://127.0.0.1:$BACKEND_PORT"
cd "$BACKEND_DIR"
exec "$BACKEND_VENV/bin/uvicorn" api.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --log-level info
