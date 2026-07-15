#!/usr/bin/env bash

# Re-exec under bash if invoked via sh/dash — ${BASH_SOURCE[0]} and other
# bashisms below silently misbehave under POSIX sh instead of failing loudly.
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/backend"

if [ ! -x ".venv/bin/python3" ]; then
  echo "backend/.venv is missing or incomplete. Run ./scripts/setup.sh first."
  exit 1
fi

. "$ROOT_DIR/backend/.venv/bin/activate"
python -m app.db.create_session "$@"
