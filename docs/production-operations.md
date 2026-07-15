# LDC Production Operations Guide

This guide documents the actual running deployment on the LDC production/staging host: two `systemd` services behind `nginx`, backed by system PostgreSQL. It is the reference for restarting the stack, recreating the backend virtualenv, and knowing exactly which package versions are installed.

This is a different path from local Docker Compose development (`scripts/dev.sh`). On this host, Postgres runs as a native `systemctl` service (not the `docker-compose.yml` container), and the app runs as two `systemd` units instead of foreground `npm`/`uvicorn` processes.

## 1. Topology

| Component | How it runs | Port | Managed by |
| --- | --- | --- | --- |
| PostgreSQL | native package, `postgresql.service` | `5432` | `systemctl` |
| Backend (FastAPI/uvicorn) | `ldc-backend.service` | `8000` | `systemctl` |
| Frontend (Next.js) | `ldc-frontend.service` | `3001` internally | `systemctl` |
| nginx | reverse proxy, public entry point | `3000` (public traffic) | `systemctl` |

nginx (`/etc/nginx/sites-enabled/ldc`) proxies almost everything to the Next.js frontend upstream (`ldc_app` → `127.0.0.1:3001`), including `/api/health`, `/api/auth/*`, and `/forms/`. The FastAPI backend on `:8000` is reached directly (e.g. `http://host:8000/docs`) — it is not behind the same nginx vhost as the frontend's own `/api/*` routes.

`DATABASE_URL` in `.env` points at the native Postgres instance on `localhost:5432` (not the Compose container's `5433`).

Host observed: Ubuntu 26.04, Python 3.14.4, Node v20.20.2 / npm 10.8.2.

The nginx rate-limit zones, proxy microcache path, and the `ldc_app` upstream definition live in the `http {}` block of `/etc/nginx/nginx.conf` on this host (via `limit_req_zone`, `limit_conn_zone`, `proxy_cache_path`, `upstream ldc_app`). They are captured for reuse in `infra/nginx/ldc-upstream.conf`, meant to be dropped into `/etc/nginx/conf.d/` on a fresh host rather than hand-edited into `nginx.conf` again.

## 2. Fresh-Host Provisioning

Nothing above exists by default on a new machine — `nginx` is not installed by `scripts/setup.sh`/`bootstrap.sh`, and the two systemd units and nginx site config are not created by any script. They are now tracked under `infra/`:

- `infra/systemd/ldc-backend.service`
- `infra/systemd/ldc-frontend.service`
- `infra/nginx/ldc-upstream.conf` (rate-limit zones, cache path, upstream)
- `infra/nginx/ldc-site.conf` (the `:3000` server block)

To go from a bare host to the full production topology:

```bash
./scripts/bootstrap.sh           # or setup.sh — installs Python/Node/Postgres,
                                  # creates backend/.venv, builds the frontend
./scripts/provision-production.sh   # installs nginx, registers systemd units,
                                     # starts ldc-backend + ldc-frontend
```

`provision-production.sh` installs `nginx` via `apt-get` if missing, copies the `infra/nginx/*` and `infra/systemd/*` files into place (backing up any existing file that differs, as `<file>.bak.<timestamp>`), runs `nginx -t`, reloads nginx, `daemon-reload`s systemd, enables both units, and starts them.

The systemd unit files assume the repo lives at `/home/ubuntu/LDC` and runs as user `ubuntu` — edit `infra/systemd/*.service` first if your host differs, then re-run the script.

## 3. Service Management

Check status:

```bash
sudo systemctl status ldc-backend.service --no-pager
sudo systemctl status ldc-frontend.service --no-pager
sudo systemctl status postgresql --no-pager
```

Restart (recommended order — Postgres first, then backend, then frontend):

```bash
sudo systemctl restart postgresql
sudo systemctl restart ldc-backend.service
sudo systemctl restart ldc-frontend.service
```

The frontend unit's `ExecStartPre` runs `npm run build` before `next start`, so `systemctl restart ldc-frontend.service` always rebuilds first. Expect the restart to take longer than the backend (tens of seconds) — poll with:

```bash
watch -n2 systemctl is-active ldc-frontend.service
```

Stop / start individually:

```bash
sudo systemctl stop ldc-frontend.service
sudo systemctl start ldc-frontend.service
```

Tail logs:

```bash
journalctl -u ldc-backend -f
journalctl -u ldc-frontend -f
journalctl -u ldc-frontend -n 80 --no-pager
```

Both units have `Restart=` policies (`always` for backend, `on-failure` for frontend with a 5-in-300s start limit), so a crashed process is expected to self-recover; check `journalctl` if a service is flapping.

## 4. Post-Restart Verification

Run these after any restart:

```bash
curl -sS http://127.0.0.1:8000/health          # {"status":"ok","environment":"production"}
curl -sS http://127.0.0.1:3000/api/health       # {"ok":true,"uptime":...}  (through nginx)
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/docs
sudo systemctl is-active postgresql ldc-backend.service ldc-frontend.service
```

All three should report `active`, and both health endpoints should return `200`.

## 5. Backend Python Environment

- Location: `backend/.venv`
- Python: 3.14.4 (created with `python3 -m venv .venv`; the project only requires `>=3.11`, so any modern `python3` works)
- Dependencies are declared in `backend/pyproject.toml` and installed with `pip install -e ".[dev]"`.

Recreate from scratch if the venv is ever missing or corrupted:

```bash
cd backend
rm -rf .venv
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"
```

Declared dependencies (`pyproject.toml`):

Runtime:
- `fastapi>=0.115.0`
- `uvicorn[standard]>=0.30.0`
- `sqlalchemy>=2.0.31`
- `psycopg[binary]>=3.2.1`
- `pydantic-settings>=2.4.0`
- `cryptography>=43.0.0`
- `python-jose[cryptography]>=3.3.0`
- `email-validator>=2.2.0`

Dev extras (`.[dev]`):
- `pytest>=8.3.0`
- `httpx>=0.27.0`
- `ruff>=0.6.0`

Installed versions as of the last verified restart (`.venv/bin/pip list --format=freeze`):

```
annotated-doc==0.0.4        annotated-types==0.7.0      anyio==4.13.0
certifi==2026.4.22          cffi==2.0.0                 click==8.3.3
cryptography==48.0.0        dnspython==2.8.0            ecdsa==0.19.2
email-validator==2.3.0      fastapi==0.136.1            greenlet==3.5.0
h11==0.16.0                 httpcore==1.0.9             httptools==0.7.1
httpx==0.28.1                idna==3.15                  iniconfig==2.3.0
ldc-backend==0.1.0          packaging==26.2             pip==26.1.1
pluggy==1.6.0                psycopg==3.3.4               psycopg-binary==3.3.4
pyasn1==0.6.3                pycparser==3.0               pydantic==2.13.4
pydantic_core==2.46.4        pydantic-settings==2.14.1   Pygments==2.20.0
pytest==9.0.3                python-dotenv==1.2.2         python-jose==3.5.0
PyYAML==6.0.3                rsa==4.9.1                    ruff==0.15.12
six==1.17.0                  SQLAlchemy==2.0.49           starlette==1.0.0
typing_extensions==4.15.0    typing-inspection==0.4.2     uvicorn==0.46.0
uvloop==0.22.1                watchfiles==1.1.1           websockets==16.0
```

Sanity checks after (re)installing:

```bash
cd backend
. .venv/bin/activate
ruff check .        # should print "All checks passed!"
pytest -q           # should pass
python -m app.db.init_db   # apply/verify schema against DATABASE_URL
```

## 6. Frontend Node Environment

- Node: v20.20.2, npm: 10.8.2 (repo requires Node 20+)
- Dependencies declared in `frontend/package.json`, locked in `frontend/package-lock.json`.

Recreate from scratch:

```bash
cd frontend
rm -rf node_modules .next
npm ci
npm run build
```

Runtime dependencies:
- `next@16.2.6`, `react@19.2.6`, `react-dom@19.2.6`
- `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`
- `lucide-react@0.468.0`
- `read-excel-file@5.8.8`

Dev dependencies:
- `typescript@5.9.3`
- `@types/node@22.19.19`, `@types/react@19.2.14`, `@types/react-dom@19.2.3`
- `playwright-core@1.60.0`

`overrides.postcss` is pinned to `8.5.10`.

`ldc-frontend.service` sets `NODE_OPTIONS=--max-old-space-size=400`, `MemoryMax=600M`, `MemoryHigh=500M` — this is a memory-constrained host (2 GB class instance). If the frontend OOM-kills during a heavy build, that ceiling is the first thing to check (`journalctl -u ldc-frontend | grep -i oom`).

## 7. Full Restart Runbook (last verified 2026-07-15)

```bash
sudo systemctl restart postgresql
sudo systemctl restart ldc-backend.service
sudo systemctl restart ldc-frontend.service

# wait for frontend build+start
until systemctl is-active --quiet ldc-frontend.service; do sleep 5; done

curl -sS http://127.0.0.1:8000/health
curl -sS http://127.0.0.1:3000/api/health
sudo systemctl status ldc-backend.service ldc-frontend.service --no-pager
```

Result of the last run: both services came back `active (running)` within ~40s, `/health` and `/api/health` both returned success, `ruff check .` reported no issues, and `pytest -q` passed (2 passed). No dependency or configuration fixes were needed — the venv, `node_modules`, and systemd units were already in a correct state.

## 8. Related Docs

- [README.md](../README.md) — general setup, scripts reference, domain/DNS setup.
- [docs/database-operations.md](database-operations.md) — Postgres schema, backups, session/data management.
- [docs/chapter-setup-guide.md](chapter-setup-guide.md) — printable operator handoff guide.
