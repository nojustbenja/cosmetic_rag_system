#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

port_in_use() {
  lsof -i "tcp:$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

# Determine package manager
if require_command pnpm; then
  PKG_MANAGER="pnpm"
elif require_command bun; then
  PKG_MANAGER="bun"
elif require_command npm; then
  PKG_MANAGER="npm"
else
  echo "❌ Missing required command: pnpm, bun, or npm"
  exit 1
fi

require_command lsof || { echo "❌ Missing required command: lsof"; exit 1; }

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "📥 Installing frontend dependencies using $PKG_MANAGER..."
  cd "$FRONTEND_DIR"
  $PKG_MANAGER install
fi

if port_in_use "$FRONTEND_PORT"; then
  echo "🚫 Frontend port $FRONTEND_PORT is already in use."
  echo "   Stop the existing process or run with: FRONTEND_PORT=5174 ./start-frontend.sh"
  exit 1
fi

echo "🚀 Starting frontend on http://localhost:$FRONTEND_PORT"
cd "$FRONTEND_DIR"

if [[ "$PKG_MANAGER" == "npm" ]]; then
  exec npm run dev -- --host localhost --port "$FRONTEND_PORT"
else
  exec $PKG_MANAGER run dev --host localhost --port "$FRONTEND_PORT"
fi
