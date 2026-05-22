#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

backend_pid=""
frontend_pid=""

cleanup() {
  echo
  echo "🛑 Stopping services..."
  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi
  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi
  echo "✅ Services stopped."
}

trap cleanup EXIT INT TERM

echo "🌟 Starting Sistema RAG Cosmetica..."
echo

echo "📡 Backend:  http://localhost:$BACKEND_PORT"
BACKEND_PORT="$BACKEND_PORT" "$ROOT_DIR/start-backend.sh" &
backend_pid=$!

# Give backend a moment to start and potentially create .env
sleep 1

echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
FRONTEND_PORT="$FRONTEND_PORT" "$ROOT_DIR/start-frontend.sh" &
frontend_pid=$!

echo
echo "🚀 Project is initializing..."
echo "💡 Press Ctrl+C to stop both services."
echo

wait "$backend_pid" "$frontend_pid"
