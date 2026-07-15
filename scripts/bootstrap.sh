#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -t 0 ]; then
  echo "This bootstrap script is interactive. Run it from a terminal."
  exit 1
fi

prompt() {
  local label="$1"
  local default="${2:-}"
  local value
  if [ -n "$default" ]; then
    read -r -p "$label [$default]: " value
    printf '%s' "${value:-$default}"
  else
    read -r -p "$label: " value
    printf '%s' "$value"
  fi
}

prompt_secret() {
  local label="$1"
  local first second
  while true; do
    read -r -s -p "$label: " first
    printf '\n'
    read -r -s -p "Confirm $label: " second
    printf '\n'
    if [ -z "$first" ]; then
      echo "Value cannot be empty." >&2
    elif [ "$first" != "$second" ]; then
      echo "Values did not match. Try again." >&2
    else
      printf '%s' "$first"
      return 0
    fi
  done
}

prompt_secret_preserve() {
  local label="$1"
  local existing="${2:-}"
  local first second
  if [ -n "$existing" ]; then
    read -r -s -p "$label [press Enter to keep existing value]: " first
    printf '\n'
    if [ -z "$first" ]; then
      printf '%s' "$existing"
      return 0
    fi
    read -r -s -p "Confirm $label: " second
    printf '\n'
    if [ "$first" != "$second" ]; then
      echo "Values did not match. Try again." >&2
      prompt_secret_preserve "$label" "$existing"
      return 0
    fi
    printf '%s' "$first"
    return 0
  fi
  prompt_secret "$label"
}

random_urlsafe() {
  python3 -c "import secrets; print(secrets.token_urlsafe(48))"
}

random_field_key() {
  python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
}

url_encode() {
  python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=''))" "$1"
}

sql_escape_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

require_identifier() {
  local label="$1"
  local value="$2"
  if ! [[ "$value" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "$label must start with a letter or underscore and contain only letters, numbers, and underscores."
    exit 1
  fi
}

existing_env_value() {
  local key="$1"
  if [ ! -f "$ROOT_DIR/.env" ]; then
    return 0
  fi
  python3 - "$ROOT_DIR/.env" "$key" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
wanted = sys.argv[2]

for raw_line in path.read_text().splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    if key.strip() != wanted:
        continue
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    print(value, end="")
    break
PY
}

existing_first_env_value() {
  local key value
  for key in "$@"; do
    value="$(existing_env_value "$key")"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
}

echo ""
echo "LDC fresh setup"
echo "==============="
echo "This script will configure .env, create PostgreSQL, install dependencies,"
echo "initialize the database, build the frontend, and optionally set up pgAdmin."
echo ""

APP_ENV="$(prompt "App environment" "$(existing_first_env_value APP_ENV || true)")"
APP_ENV="${APP_ENV:-local}"
DB_NAME="$(prompt "PostgreSQL database name" "$(existing_first_env_value DB_NAME || true)")"
DB_NAME="${DB_NAME:-ldc}"
DB_USER="$(prompt "PostgreSQL database user" "$(existing_first_env_value DB_USER || true)")"
DB_USER="${DB_USER:-ldc}"
DB_PORT="$(prompt "PostgreSQL port" "$(existing_first_env_value DB_PORT POSTGRES_HOST_PORT || true)")"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="$(prompt_secret_preserve "PostgreSQL password for $DB_USER" "$(existing_first_env_value DB_PASSWORD || true)")"
ORGANIZER_PASS="$(prompt_secret_preserve "Organizer website password" "$(existing_first_env_value ORGANIZER_PASS || true)")"
PGADMIN_EMAIL="$(prompt "pgAdmin email" "$(existing_first_env_value PGADMIN_EMAIL || true)")"
PGADMIN_EMAIL="${PGADMIN_EMAIL:-admin@ldc.local}"
PGADMIN_PASSWORD="$(prompt_secret_preserve "pgAdmin password" "$(existing_first_env_value PGADMIN_PASSWORD || true)")"
SMTP_HOST="$(prompt "SMTP host" "$(existing_first_env_value SMTP_HOST || true)")"
SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="$(prompt "SMTP port" "$(existing_first_env_value SMTP_PORT || true)")"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_FROM="$(prompt "SMTP from email" "$(existing_first_env_value SMTP_FROM || true)")"
SMTP_FROM="${SMTP_FROM:-organizers@example.org}"
SMTP_FROM_NAME="$(prompt "SMTP from display name" "$(existing_first_env_value SMTP_FROM_NAME || true)")"
SMTP_FROM_NAME="${SMTP_FROM_NAME:-Little Dates Club}"
SMTP_USERNAME="$(prompt "SMTP username" "$(existing_first_env_value SMTP_USERNAME SMTP_USER || true)")"
SMTP_USERNAME="${SMTP_USERNAME:-$SMTP_FROM}"
SMTP_APP_PASSWORD="$(prompt_secret_preserve "SMTP app password" "$(existing_first_env_value SMTP_APP_PASSWORD SMTP_PASS || true)")"
LOAD_SAMPLE_DATA="$(prompt "Load browser-side sample data? Type true or false" "$(existing_first_env_value NEXT_PUBLIC_LOAD_SAMPLE_DATA || true)")"
LOAD_SAMPLE_DATA="${LOAD_SAMPLE_DATA:-false}"

require_identifier "Database name" "$DB_NAME"
require_identifier "Database user" "$DB_USER"

if ! [[ "$DB_PORT" =~ ^[0-9]+$ ]]; then
  echo "PostgreSQL port must be numeric."
  exit 1
fi

if ! [[ "$SMTP_PORT" =~ ^[0-9]+$ ]]; then
  echo "SMTP port must be numeric."
  exit 1
fi

if [ "$LOAD_SAMPLE_DATA" != "true" ] && [ "$LOAD_SAMPLE_DATA" != "false" ]; then
  echo "Sample data setting must be true or false."
  exit 1
fi

echo ""
echo "[1/8] Checking system dependencies..."

if ! command -v python3 >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y python3 python3-venv python3-pip
fi

if ! command -v curl >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y curl ca-certificates
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y postgresql postgresql-contrib
fi

echo "Python: $(python3 --version)"
echo "Node:   $(node --version)"
echo "npm:    $(npm --version)"
echo "psql:   $(psql --version | head -1)"

echo ""
echo "[2/8] Starting PostgreSQL..."
sudo systemctl enable postgresql --quiet
sudo systemctl start postgresql

DB_PASSWORD_SQL="$(sql_escape_literal "$DB_PASSWORD")"

echo ""
echo "[3/8] Creating database user and database..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -c "ALTER USER \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD_SQL}';"
else
  sudo -u postgres psql -c "CREATE USER \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD_SQL}';"
fi

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres psql -c "ALTER DATABASE \"${DB_NAME}\" OWNER TO \"${DB_USER}\";"
else
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
fi

echo ""
echo "[4/8] Writing .env..."
SESSION_SECRET="$(random_urlsafe)"
FIELD_ENCRYPTION_KEY="$(random_field_key)"
DB_PASSWORD_URL="$(url_encode "$DB_PASSWORD")"
DATABASE_URL="postgresql+psycopg://${DB_USER}:${DB_PASSWORD_URL}@localhost:${DB_PORT}/${DB_NAME}"

umask 077
cat > .env <<EOF
APP_ENV=${APP_ENV}
POSTGRES_HOST_PORT=${DB_PORT}
DATABASE_URL=${DATABASE_URL}
BACKEND_CORS_ORIGINS=http://localhost:3000

FIELD_ENCRYPTION_KEY=${FIELD_ENCRYPTION_KEY}

OIDC_ISSUER=http://localhost:8080/realms/ldc
OIDC_AUDIENCE=ldc-api
DEV_AUTH_ENABLED=true

SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_FROM=${SMTP_FROM}
SMTP_FROM_NAME=${SMTP_FROM_NAME}
SMTP_USER=${SMTP_USERNAME}
SMTP_PASS=${SMTP_APP_PASSWORD}
SMTP_USERNAME=${SMTP_USERNAME}
SMTP_APP_PASSWORD=${SMTP_APP_PASSWORD}

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_LOAD_SAMPLE_DATA=${LOAD_SAMPLE_DATA}
ORGANIZER_PASS=${ORGANIZER_PASS}
SESSION_SECRET=${SESSION_SECRET}

PGADMIN_EMAIL=${PGADMIN_EMAIL}
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}
DB_HOST=host.docker.internal
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF
chmod 600 .env

echo ""
echo "[5/8] Installing backend dependencies..."
cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
. .venv/bin/activate
pip install --upgrade pip --quiet
pip install -e ".[dev]" --quiet

echo ""
echo "[6/8] Initializing database tables..."
python -m app.db.init_db

echo ""
echo "[7/8] Installing and building frontend..."
cd "$ROOT_DIR/frontend"
npm ci --prefer-offline
NEXT_TELEMETRY_DISABLED=1 npm run build

echo ""
echo "[8/8] Optional pgAdmin setup..."
SETUP_PGADMIN="$(prompt "Start pgAdmin database viewer now? Type yes or no" "yes")"
if [ "$SETUP_PGADMIN" = "yes" ]; then
  cd "$ROOT_DIR"
  if command -v docker >/dev/null 2>&1; then
    ./scripts/setup-db-viewer.sh --replace
  else
    echo "Docker is not installed, so pgAdmin was skipped."
    echo "Install Docker later and run: ./scripts/setup-db-viewer.sh"
  fi
fi

echo ""
echo "Setup complete."
echo ""
if [ "$APP_ENV" = "production" ]; then
  echo "APP_ENV is production. To install nginx and register the ldc-backend/"
  echo "ldc-frontend systemd services, run:"
  echo "  ./scripts/provision-production.sh"
  echo "See docs/production-operations.md for details."
  echo ""
fi
echo "Start the app with:"
echo "  ./scripts/startup.sh"
echo ""
echo "Or start the local development stack with:"
echo "  ./scripts/dev.sh"
echo ""
echo "Open:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000/docs"
echo "  pgAdmin:  http://localhost:5050"
echo ""
echo "Keep .env private. It contains passwords and generated secrets."
