#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/backend"

if [ ! -d ".venv" ]; then
  echo "backend/.venv is missing. Run ./scripts/setup.sh first."
  exit 1
fi

. .venv/bin/activate
python -m app.db.clear_dummy_data "$@"
