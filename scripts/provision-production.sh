#!/usr/bin/env bash
# ── LDC production provisioning ────────────────────────────────────────────
# Installs nginx and registers the LDC systemd services from the tracked
# configs under infra/systemd/ and infra/nginx/. This is the counterpart to
# docker-compose.yml for local dev: it captures the production topology
# (nginx reverse proxy + two systemd units) as reproducible, version-
# controlled source instead of hand-edited files that only exist on one host.
#
# Run scripts/setup.sh (or bootstrap.sh) first — this script assumes
# backend/.venv and frontend/node_modules + a production build already exist.
#
# Usage:
#   ./scripts/provision-production.sh
#
# Safe to re-run. Existing files that differ from the tracked version are
# backed up to <file>.bak.<timestamp> before being overwritten.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TIMESTAMP="$(date +%Y%m%d%H%M%S)"

install_file() {
  local src="$1" dest="$2"
  if [ -f "$dest" ] && ! cmp -s "$src" "$dest"; then
    echo "  Backing up existing $dest -> $dest.bak.$TIMESTAMP"
    sudo cp "$dest" "$dest.bak.$TIMESTAMP"
  fi
  sudo cp "$src" "$dest"
  echo "  Installed $dest"
}

echo ""
echo "[1/4] Installing nginx..."
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y nginx
fi
echo "  $(nginx -v 2>&1)"

echo ""
echo "[2/4] Installing nginx site config..."
sudo mkdir -p /etc/nginx/conf.d /etc/nginx/sites-available /etc/nginx/sites-enabled
install_file "infra/nginx/ldc-upstream.conf" "/etc/nginx/conf.d/ldc-upstream.conf"
install_file "infra/nginx/ldc-site.conf" "/etc/nginx/sites-available/ldc"
sudo ln -sf /etc/nginx/sites-available/ldc /etc/nginx/sites-enabled/ldc
sudo nginx -t
sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx
echo "  nginx config valid and reloaded"

echo ""
echo "[3/4] Installing systemd units..."
install_file "infra/systemd/ldc-backend.service" "/etc/systemd/system/ldc-backend.service"
install_file "infra/systemd/ldc-frontend.service" "/etc/systemd/system/ldc-frontend.service"
sudo systemctl daemon-reload
sudo systemctl enable ldc-backend.service ldc-frontend.service

echo ""
echo "[4/4] Starting services..."
sudo systemctl restart ldc-backend.service
sudo systemctl restart ldc-frontend.service

echo ""
echo "Provisioning complete."
echo "Verify with:"
echo "  curl -sS http://127.0.0.1:8000/health"
echo "  curl -sS http://127.0.0.1:3000/api/health"
echo "  sudo systemctl status ldc-backend.service ldc-frontend.service --no-pager"
echo ""
echo "infra/systemd/*.service assume repo path /home/ubuntu/LDC and user 'ubuntu'."
echo "Edit those files before running this script if your host differs."
