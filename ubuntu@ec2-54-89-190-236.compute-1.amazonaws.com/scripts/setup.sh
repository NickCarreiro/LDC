#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
fi

if grep -q "REPLACE_WITH_32_BYTE_BASE64_KEY" .env; then
  KEY="$(python3 - <<'PY'
import base64, os
print(base64.urlsafe_b64encode(os.urandom(32)).decode())
PY
)"
  python3 - <<PY
from pathlib import Path
path = Path(".env")
text = path.read_text()
path.write_text(text.replace("REPLACE_WITH_32_BYTE_BASE64_KEY", "$KEY"))
PY
fi

python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install --upgrade pip
backend/.venv/bin/python -m pip install -e "backend[dev]"

if command -v npm >/dev/null 2>&1; then
  npm --prefix frontend install
else
  echo "npm is required for the frontend. Install Node.js 20+ and rerun this script."
fi

docker compose up -d postgres keycloak mailhog

echo "Waiting for Postgres to accept connections..."
for _ in {1..40}; do
  if docker compose exec -T postgres pg_isready -U ldc -d ldc >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker compose exec -T postgres pg_isready -U ldc -d ldc >/dev/null
backend/.venv/bin/python -m app.db.init_db

echo "Setup complete. Run ./scripts/dev.sh to start the app."
