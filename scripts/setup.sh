#!/usr/bin/env bash

# Re-exec under bash if invoked via sh/dash — ${BASH_SOURCE[0]} and other
# bashisms below silently misbehave under POSIX sh instead of failing loudly.
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
# ── LDC setup + start ─────────────────────────────────────────────────────────
# Run once (or any time) on the EC2 instance after cloning / pulling.
# Installs all deps, creates the local Postgres DB, migrates, builds, and starts.
#
# Usage:
#   ./scripts/setup.sh
#
# Re-running is safe — idempotent where possible.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
WORKERS="${WORKERS:-2}"
DB_NAME="ldc"
DB_USER="ldc"
DB_PASS="ldc_dev_password"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║        LDC Operations — Setup            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. System dependencies ────────────────────────────────────────────────────
echo "[1/7] Checking system dependencies..."

if ! command -v python3 &>/dev/null; then
  echo "  Installing Python 3..."
  sudo apt-get update -qq && sudo apt-get install -y python3 python3-venv python3-pip
fi

if ! command -v node &>/dev/null; then
  echo "  Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null
  sudo apt-get install -y nodejs
fi

if ! command -v psql &>/dev/null; then
  echo "  Installing PostgreSQL..."
  sudo apt-get update -qq && sudo apt-get install -y postgresql postgresql-contrib
fi

echo "  Python $(python3 --version)  Node $(node --version)  PostgreSQL $(psql --version | head -1)"

# ── 2. PostgreSQL ─────────────────────────────────────────────────────────────
echo "[2/7] Configuring PostgreSQL..."

sudo systemctl enable postgresql --quiet
sudo systemctl start postgresql

# Create user + DB if they don't exist
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

echo "  Postgres: $DB_NAME@localhost ready"

# ── 3. Environment file ───────────────────────────────────────────────────────
echo "[3/7] Configuring environment..."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created .env from .env.example"
fi

# Generate encryption key if placeholder is still there
if grep -q "REPLACE_WITH_32_BYTE_BASE64_KEY" .env; then
  KEY="$(python3 -c 'import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())')"
  sed -i "s|REPLACE_WITH_32_BYTE_BASE64_KEY|$KEY|" .env
  echo "  Generated FIELD_ENCRYPTION_KEY"
fi

# Patch DATABASE_URL to use local Postgres
sed -i "s|POSTGRES_HOST_PORT=.*|POSTGRES_HOST_PORT=5432|" .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql+psycopg://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|" .env

echo "  DATABASE_URL → localhost:5432/$DB_NAME"

# ── 4. Backend Python env ─────────────────────────────────────────────────────
echo "[4/7] Installing backend dependencies..."

cd "$ROOT_DIR/backend"
if [ ! -x ".venv/bin/python3" ]; then
  rm -rf .venv
  python3 -m venv .venv
fi
. "$ROOT_DIR/backend/.venv/bin/activate"
pip install --upgrade pip --quiet
pip install -e ".[dev]" --quiet
echo "  Backend packages installed"

# ── 5. Database migration ─────────────────────────────────────────────────────
echo "[5/7] Running database migrations..."

python -m app.db.init_db
echo "  DB schema up to date"

# ── 6. Frontend build ─────────────────────────────────────────────────────────
echo "[6/7] Installing and building frontend..."

cd "$ROOT_DIR/frontend"
npm ci --prefer-offline --silent
NEXT_TELEMETRY_DISABLED=1 npm run build
echo "  Next.js build complete"

# ── 7. Start services ─────────────────────────────────────────────────────────
echo "[7/7] Starting services..."
echo ""
echo "  Backend  → http://localhost:$BACKEND_PORT"
echo "  Frontend → http://localhost:$FRONTEND_PORT"
echo ""
echo "  Press Ctrl-C to stop both."
echo ""

cleanup() {
  echo ""
  echo "[setup] Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR/backend"
. "$ROOT_DIR/backend/.venv/bin/activate"
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "$BACKEND_PORT" \
  --workers "$WORKERS" \
  --proxy-headers \
  --forwarded-allow-ips="*" &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
NEXT_TELEMETRY_DISABLED=1 npm run start -- --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

wait
