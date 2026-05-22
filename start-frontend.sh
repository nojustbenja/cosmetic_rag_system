#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

port_in_use() {
  lsof -i "tcp:$1" -sTCP:LISTEN -t >/dev/null 2>&1
}


require_command pnpm
require_command lsof

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  pnpm --dir "$FRONTEND_DIR" install
fi

if port_in_use "$FRONTEND_PORT"; then
  echo "Frontend port $FRONTEND_PORT is already in use."
  echo "Stop the existing process or run with FRONTEND_PORT=5174 ./start-frontend.sh"
  exit 1
fi

echo "Starting frontend on http://127.0.0.1:$FRONTEND_PORT"
cd "$FRONTEND_DIR"
exec pnpm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT"
