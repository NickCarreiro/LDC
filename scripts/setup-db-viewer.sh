#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

PGADMIN_CONTAINER="${PGADMIN_CONTAINER:-ldc-pgadmin}"
PGADMIN_IMAGE="${PGADMIN_IMAGE:-dpage/pgadmin4:latest}"
PGADMIN_PORT="${PGADMIN_PORT:-5050}"
PGADMIN_EMAIL="${PGADMIN_EMAIL:-admin@ldc.local}"
PGADMIN_PASSWORD="${PGADMIN_PASSWORD:-ldc_pgadmin_change_me}"
PGADMIN_DATA_DIR="${PGADMIN_DATA_DIR:-$ROOT_DIR/.local/pgadmin}"

DB_NAME="${DB_NAME:-ldc}"
DB_USER="${DB_USER:-ldc}"
DB_PASSWORD="${DB_PASSWORD:-ldc_dev_password}"
DB_HOST="${DB_HOST:-host.docker.internal}"
DB_PORT="${DB_PORT:-5432}"

usage() {
  cat <<'USAGE'
Install and configure pgAdmin for viewing the LDC PostgreSQL database.

Defaults:
  pgAdmin URL:      http://localhost:5050
  pgAdmin login:    admin@ldc.local / ldc_pgadmin_change_me
  DB connection:    host.docker.internal:5432, db=ldc, user=ldc

Override with environment variables:
  PGADMIN_PORT=5051 PGADMIN_EMAIL=you@example.com PGADMIN_PASSWORD='strong-pass'
  DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=ldc DB_USER=ldc DB_PASSWORD='...'

Examples:
  ./scripts/setup-db-viewer.sh
  DB_PORT=5433 ./scripts/setup-db-viewer.sh
  PGADMIN_PORT=5051 PGADMIN_PASSWORD='replace-me' ./scripts/setup-db-viewer.sh

Flags:
  --help        Show this help text.
  --replace     Remove any existing ldc-pgadmin container before starting.
USAGE
}

REPLACE=0
for arg in "$@"; do
  case "$arg" in
    --help|-h)
      usage
      exit 0
      ;;
    --replace)
      REPLACE=1
      ;;
    *)
      echo "Unknown argument: $arg"
      usage
      exit 1
      ;;
  esac
done

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a

  if [ -n "${POSTGRES_HOST_PORT:-}" ] && [ "${DB_PORT}" = "5432" ]; then
    DB_PORT="$POSTGRES_HOST_PORT"
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run pgAdmin."
  echo "Install Docker Desktop or Docker Engine, then re-run this script."
  exit 1
fi

mkdir -p "$PGADMIN_DATA_DIR"

SERVERS_JSON="$PGADMIN_DATA_DIR/servers.json"
cat > "$SERVERS_JSON" <<JSON
{
  "Servers": {
    "1": {
      "Name": "LDC PostgreSQL",
      "Group": "Servers",
      "Host": "$DB_HOST",
      "Port": $DB_PORT,
      "MaintenanceDB": "$DB_NAME",
      "Username": "$DB_USER",
      "SSLMode": "prefer",
      "PassFile": "/pgpass"
    }
  }
}
JSON

PGPASS_FILE="$PGADMIN_DATA_DIR/pgpass"
cat > "$PGPASS_FILE" <<PGPASS
$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD
PGPASS
chmod 600 "$PGPASS_FILE"

if docker ps -a --format '{{.Names}}' | grep -qx "$PGADMIN_CONTAINER"; then
  if [ "$REPLACE" = "1" ]; then
    docker rm -f "$PGADMIN_CONTAINER" >/dev/null
  else
    docker start "$PGADMIN_CONTAINER" >/dev/null
    echo "pgAdmin is already configured and running at http://localhost:$PGADMIN_PORT"
    exit 0
  fi
fi

docker run -d \
  --name "$PGADMIN_CONTAINER" \
  --add-host=host.docker.internal:host-gateway \
  -p "$PGADMIN_PORT:80" \
  -e "PGADMIN_DEFAULT_EMAIL=$PGADMIN_EMAIL" \
  -e "PGADMIN_DEFAULT_PASSWORD=$PGADMIN_PASSWORD" \
  -e "PGADMIN_CONFIG_SERVER_MODE=False" \
  -v "$SERVERS_JSON:/pgadmin4/servers.json:ro" \
  -v "$PGPASS_FILE:/pgpass:ro" \
  "$PGADMIN_IMAGE" >/dev/null

cat <<EOF
pgAdmin is starting.

Open:      http://localhost:$PGADMIN_PORT
Login:     $PGADMIN_EMAIL
Password:  $PGADMIN_PASSWORD

The "LDC PostgreSQL" server connection has been preloaded.
Database:  $DB_NAME
User:      $DB_USER
Host:      $DB_HOST
Port:      $DB_PORT

For a shared or production environment, change PGADMIN_PASSWORD before running this script.
EOF
