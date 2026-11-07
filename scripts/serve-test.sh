#!/usr/bin/env bash
# Serves the built app (dist/) against the e2e backend (real Express app on an in-memory
# MongoDB), for Lighthouse CI or for clicking around a production build locally.
#
#   npm run build && npm run serve:test -- --port 5102
set -euo pipefail

API_PORT="${E2E_API_PORT:-5101}"

E2E_API_PORT="$API_PORT" npx tsx tests/e2e/api-server.ts &
api_pid=$!
trap 'kill "$api_pid" 2>/dev/null || true' EXIT INT TERM

# Wait for the backend (the first run downloads the MongoDB binary).
for _ in $(seq 1 180); do
  curl -sf "http://127.0.0.1:${API_PORT}/api/ping" >/dev/null && break
  sleep 1
done

API_PROXY_TARGET="http://127.0.0.1:${API_PORT}" npx vite preview --host 127.0.0.1 --strictPort "$@"
