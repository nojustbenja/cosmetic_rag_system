#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

backend_pid=""
frontend_pid=""

cleanup() {
  echo
  echo "Stopping services..."
  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi
  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting backend on http://127.0.0.1:$BACKEND_PORT"
BACKEND_PORT="$BACKEND_PORT" "$ROOT_DIR/start-backend.sh" &
backend_pid=$!

echo "Starting frontend on http://127.0.0.1:$FRONTEND_PORT"
FRONTEND_PORT="$FRONTEND_PORT" "$ROOT_DIR/start-frontend.sh" &
frontend_pid=$!

echo
echo "Project is starting:"
echo "- Backend:  http://127.0.0.1:$BACKEND_PORT"
echo "- Frontend: http://127.0.0.1:$FRONTEND_PORT"
echo
echo "Press Ctrl+C to stop both services."

wait "$backend_pid" "$frontend_pid"
