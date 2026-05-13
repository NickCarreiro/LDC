#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ulimit -n 8192 >/dev/null 2>&1 || true

docker compose up -d postgres keycloak mailhog

trap 'kill 0' EXIT

(
  cd backend
  . .venv/bin/activate
  WATCHFILES_FORCE_POLLING=true uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
) &

(
  cd frontend
  rm -rf .next/dev .next/cache
  NEXT_TELEMETRY_DISABLED=1 WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true npm run dev
) &

wait
