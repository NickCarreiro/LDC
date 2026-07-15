#!/usr/bin/env bash

# Re-exec under bash if invoked via sh/dash — ${BASH_SOURCE[0]} and other
# bashisms below silently misbehave under POSIX sh instead of failing loudly.
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
# ── LDC startup script ────────────────────────────────────────────────────────
# Runs both the Next.js frontend and FastAPI backend.
# Designed for AWS deployment (EC2 / ECS / App Runner).
#
# Usage:
#   ./scripts/startup.sh              # production mode
#   APP_ENV=local ./scripts/startup.sh  # local dev (skips prod-only steps)
#
# Required environment variables (set in AWS Parameter Store / Secrets Manager):
#   DATABASE_URL           postgresql+psycopg://user:pass@host:5432/ldc
#   FIELD_ENCRYPTION_KEY   32-byte base64 key
#   BACKEND_CORS_ORIGINS   https://yourdomain.com
#   NEXT_PUBLIC_API_BASE_URL  https://api.yourdomain.com
#
# Optional:
#   APP_ENV        local | production  (default: production)
#   BACKEND_PORT   (default: 8000)
#   FRONTEND_PORT  (default: 3000)
#   WORKERS        uvicorn worker count (default: 2)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ENV="${APP_ENV:-production}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
WORKERS="${WORKERS:-2}"

echo "[startup] ROOT_DIR=$ROOT_DIR  APP_ENV=$APP_ENV"

# ── 1. Backend ────────────────────────────────────────────────────────────────
echo "[startup] Installing backend dependencies..."
cd "$ROOT_DIR/backend"

if [ ! -x ".venv/bin/python3" ]; then
  rm -rf .venv
  python3 -m venv .venv
fi
. "$ROOT_DIR/backend/.venv/bin/activate"
pip install -e ".[dev]" --quiet

echo "[startup] Running database migrations..."
python -m app.db.init_db
echo "[startup] DB init complete"

if [ "$APP_ENV" = "local" ]; then
  echo "[startup] Seeding local database..."
  python -m app.db.seed || echo "[startup] Seed skipped (already seeded or error)"
fi

echo "[startup] Starting FastAPI backend on port $BACKEND_PORT..."
if [ "$APP_ENV" = "local" ]; then
  WATCHFILES_FORCE_POLLING=true uvicorn app.main:app \
    --reload --reload-dir app \
    --host 0.0.0.0 --port "$BACKEND_PORT" &
else
  uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "$BACKEND_PORT" \
    --workers "$WORKERS" \
    --proxy-headers \
    --forwarded-allow-ips="*" &
fi

BACKEND_PID=$!
echo "[startup] Backend PID $BACKEND_PID"

# ── 2. Frontend ───────────────────────────────────────────────────────────────
echo "[startup] Installing frontend dependencies..."
cd "$ROOT_DIR/frontend"
npm ci --prefer-offline --silent

if [ "$APP_ENV" != "local" ]; then
  echo "[startup] Building Next.js for production..."
  NEXT_TELEMETRY_DISABLED=1 npm run build
fi

echo "[startup] Starting Next.js on port $FRONTEND_PORT..."
if [ "$APP_ENV" = "local" ]; then
  NEXT_TELEMETRY_DISABLED=1 \
  WATCHPACK_POLLING=true \
  CHOKIDAR_USEPOLLING=true \
  npm run dev -- --port "$FRONTEND_PORT" &
else
  NEXT_TELEMETRY_DISABLED=1 \
  npm run start -- --port "$FRONTEND_PORT" &
fi

FRONTEND_PID=$!
echo "[startup] Frontend PID $FRONTEND_PID"

# ── 3. Wait and handle shutdown ───────────────────────────────────────────────
echo "[startup] Both services running. Press Ctrl-C to stop."

cleanup() {
  echo "[startup] Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "[startup] Done."
}
trap cleanup EXIT INT TERM

wait
