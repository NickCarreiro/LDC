# LDC Operations System

LDC is an organizer-first operations system for Catholic matchmaking chapters. It is not a public dating app and it does not make final match decisions automatically. It helps trusted organizers manage intake, sessions, participants, date history, match drafts, email drafts, and audit/review workflows.

This README is the main usage guide for setting up and operating the site. For a printable chapter handoff, use:

- [Chapter Setup Guide PDF](docs/chapter-setup-guide.pdf)
- [Chapter Setup Guide ODT](docs/chapter-setup-guide.odt)
- [Chapter Setup Guide Markdown](docs/chapter-setup-guide.md)

For deeper database administration, use [docs/database-operations.md](docs/database-operations.md).

## System Map

The repo is split into:

- `frontend/`: Next.js organizer console and public intake pages.
- `backend/`: FastAPI service, SQLAlchemy models, database scripts, and matching/email helpers.
- `docker-compose.yml`: local Postgres and Keycloak containers.
- `scripts/`: setup, development, database cleanup, viewer setup, and session utilities.
- `docs/`: operator guides, database guide, product notes, and audits.
- `infra/keycloak/`: local Keycloak realm scaffold.

Main local URLs:

| Service | URL | Notes |
| --- | --- | --- |
| Frontend | `http://localhost:3000` | Organizer console and public form views |
| Backend API docs | `http://localhost:8000/docs` | FastAPI OpenAPI docs |
| Backend health | `http://localhost:8000/health` | Backend service check |
| Frontend health | `http://localhost:3000/api/health` | Next.js service check |
| Keycloak | `http://localhost:8080` | Local identity-provider scaffold |
| pgAdmin | `http://localhost:5050` | Optional DB viewer from `setup-db-viewer.sh` |

## What The Site Does

Organizer console pages:

- `/`: dashboard for the active session and common workflows.
- `/sessions`: create and manage program sessions.
- `/participants`: review and edit participant records.
- `/matching`: score potential pairs and draft matches.
- `/matches`: review matchups and dating history.
- `/drafts`: prepare draft date emails.
- `/audit`: review audit/access-control information and SMTP-related local settings.

Public or semi-public form pages:

- `/forms/summer-2026`: organizer view of the intake form.
- `/forms/summer-2026/register`: public registration/intake route.

Backend API areas:

- `/participants`: participant CRUD and CSV export.
- `/sessions`: sessions and registrations.
- `/matches`: scoring, recommendation, drafts, and email draft generation.
- `/intake-forms`: intake form template routes.

## Important Data Note

There are currently two data paths:

- PostgreSQL stores backend records such as participants, sessions, registrations, date history, match drafts, staff users, and audit logs.
- Some frontend console data still uses browser storage/local mock state. Clearing PostgreSQL demo data does not automatically clear browser `localStorage` or `sessionStorage`.

For a real chapter, treat all participant records, notes, relationship history, and backups as sensitive.

## Required Local Tools

Install these before setup:

- Git
- Python 3.11 or newer
- Node.js 20 or newer
- npm
- PostgreSQL tools such as `psql` and `pg_dump`
- Docker, if using the local Postgres/Keycloak containers or pgAdmin viewer

`scripts/setup.sh` can install some system dependencies on Ubuntu-style hosts, but a chapter operator should still have a technical owner available for first-time machine setup.

## Environment File

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Key values:

```text
APP_ENV=local
POSTGRES_HOST_PORT=5433
DATABASE_URL=postgresql+psycopg://ldc:ldc_dev_password@localhost:5433/ldc
BACKEND_CORS_ORIGINS=http://localhost:3000
FIELD_ENCRYPTION_KEY=REPLACE_WITH_32_BYTE_BASE64_KEY
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Frontend organizer login also expects these values when running the deployed/protected console:

```text
ORGANIZER_PASS=replace-with-organizer-password
SESSION_SECRET=replace-with-long-random-session-secret
```

Generate a secure session secret with:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Generate a field encryption key with:

```bash
python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

Never commit `.env` or share it in normal chat.

## First-Time Setup

From the repo root:

```bash
cp .env.example .env
./scripts/setup.sh
```

What `setup.sh` does:

- Creates or updates `.env` for local Postgres.
- Creates the local `ldc` database and `ldc` user when using system Postgres.
- Creates `backend/.venv`.
- Installs backend Python dependencies.
- Initializes database tables.
- Installs frontend dependencies.
- Builds the frontend.
- Starts backend and frontend processes.

Open the site:

```text
http://localhost:3000
```

Open the backend API docs:

```text
http://localhost:8000/docs
```

## Daily Local Development

Start local containers and dev servers:

```bash
./scripts/dev.sh
```

This starts:

- Docker Compose services from `docker-compose.yml`.
- FastAPI backend on port `8000`.
- Next.js frontend on port `3000`.

Note: `scripts/dev.sh` references `mailhog`, but the current `docker-compose.yml` defines Postgres and Keycloak only. SMTP settings are present in `.env.example`, but Mailhog needs to be added back to Compose or run separately before local SMTP capture will work.

Stop the dev stack with `Ctrl-C`. If Docker containers remain running:

```bash
docker compose down
```

## Database Setup And Viewer

Initialize or update database tables:

```bash
./scripts/migrate.sh
```

Open a terminal database session:

```bash
psql "postgresql://ldc:ldc_dev_password@localhost:5433/ldc"
```

Start pgAdmin:

```bash
./scripts/setup-db-viewer.sh
```

Then open:

```text
http://localhost:5050
```

Default pgAdmin login:

```text
admin@ldc.local
ldc_pgadmin_change_me
```

For anything shared, set a stronger pgAdmin password:

```bash
PGADMIN_PASSWORD='replace-with-a-long-password' ./scripts/setup-db-viewer.sh --replace
```

The pgAdmin script creates local connection files under `.local/pgadmin/`. That directory is ignored by git because it can contain generated connection secrets.

## Demo Data

Load the small seed set:

```bash
./scripts/seed.sh
```

Load the larger synthetic test set:

```bash
./scripts/generate-test-people.sh
```

Preview demo-data cleanup:

```bash
./scripts/clear-dummy-data.sh
```

Actually remove demo/synthetic data:

```bash
./scripts/clear-dummy-data.sh --yes
```

Keep generated session shells while removing demo participants:

```bash
./scripts/clear-dummy-data.sh --keep-generated-sessions --yes
```

Preview a full database wipe for a new chapter handoff:

```bash
./scripts/clear-dummy-data.sh --all-operational-data
```

Delete all operational rows after confirming the preview and making a backup:

```bash
./scripts/clear-dummy-data.sh --all-operational-data --yes
```

Always make a backup before destructive cleanup on a real database.

## Chapter Session Setup

Create or update a chapter session:

```bash
./scripts/create-session.sh \
  --name "Fall 2026 - Chapter Name" \
  --starts-on 2026-09-12 \
  --location "Parish Hall" \
  --registration-open \
  --attach-default-intake
```

If registration should not be open yet, omit `--registration-open`.

The script is idempotent by session name. Running it again with the same `--name` updates that session.

Verify recent sessions:

```bash
psql "postgresql://ldc:ldc_dev_password@localhost:5433/ldc" \
  -c "select name, starts_on, location_label, registration_open from program_sessions order by created_at desc limit 5;"
```

Recommended chapter setup flow:

1. Pull the latest repo.
2. Configure `.env`.
3. Run `./scripts/setup.sh`.
4. Run `./scripts/setup-db-viewer.sh`.
5. Preview and remove demo data.
6. Create the chapter session.
7. Confirm the session in pgAdmin or `psql`.
8. Add or import participants through approved app/API workflows.
9. Review registrations before using matching workflows.

## Using The Organizer Console

1. Open `http://localhost:3000`.
2. Sign in with the organizer password.
3. Use `Sessions` to confirm the active session.
4. Use `Participants` to review participant records, contact fields, preferences, and notes.
5. Use `Matching Workbench` to score possible pairs and draft recommendations.
6. Use `Curation Table` to review matchups and date history.
7. Use `Draft Emails` to prepare communication drafts.
8. Use `Audit` to review access/audit information and local SMTP settings.

Organizers remain responsible for final decisions. Scores and drafts are support tools.

## Backups

Create a backup before imports, cleanup, or major changes:

```bash
pg_dump "postgresql://ldc:ldc_dev_password@localhost:5433/ldc" \
  --format=custom \
  --file "ldc-backup-$(date +%Y%m%d%H%M%S).dump"
```

Restore into an empty or disposable database:

```bash
pg_restore \
  --dbname "postgresql://ldc:ldc_dev_password@localhost:5433/ldc" \
  --clean \
  --if-exists \
  ldc-backup-YYYYMMDDHHMMSS.dump
```

Backups may contain sensitive participant information. Store them securely.

## Production/Server Notes

The deployed-style server setup uses:

- Nginx as the public reverse proxy.
- Next.js frontend service on port `3001`.
- FastAPI backend service on port `8000`.
- PostgreSQL as persistent storage.

If the public site returns `502 Bad Gateway`, check:

```bash
systemctl status ldc-frontend.service --no-pager
journalctl -u ldc-frontend -n 80 --no-pager
curl -i http://127.0.0.1:3001/
curl -i http://127.0.0.1:3000/
```

The frontend service should have a valid production `.next` build before `next start` runs.

## Troubleshooting

Permission denied on scripts:

```bash
chmod +x scripts/*.sh
```

Database connection refused:

```bash
docker compose ps postgres
sudo systemctl status postgresql --no-pager
rg '^DATABASE_URL|^POSTGRES_HOST_PORT' .env
```

Frontend will not build:

```bash
cd frontend
npm ci
npm run build
```

Backend will not start:

```bash
cd backend
. .venv/bin/activate
python -m app.db.init_db
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

pgAdmin cannot connect:

```bash
./scripts/setup-db-viewer.sh --replace
```

App still shows old sample records after PostgreSQL cleanup:

- Sign out and back in.
- Clear browser storage for `localhost:3000`.
- Restart the frontend.

## Security Checklist

- Do not commit `.env`.
- Rotate any token pasted into chat or logs.
- Use strong `ORGANIZER_PASS` and `SESSION_SECRET` values.
- Use a real `FIELD_ENCRYPTION_KEY` for any non-demo database.
- Back up before destructive operations.
- Limit pgAdmin access and change its default password for shared environments.
- Treat participant contact info, pastoral notes, feedback, and relationship history as confidential.

## Scripts Reference

All commands below are run from the repo root.

| Script | Purpose | Typical Use |
| --- | --- | --- |
| `./scripts/setup.sh` | Full first-time setup. Installs dependencies, prepares Postgres, initializes tables, builds the frontend, and starts services. | Run once on a fresh machine, or after a major setup change. |
| `./scripts/dev.sh` | Starts the local development stack. | Daily local development after setup is complete. |
| `./scripts/startup.sh` | Starts backend and frontend in a production-style flow. | Server/container startup where one command should run both services. |
| `./scripts/migrate.sh` | Initializes or updates database tables using the backend models. | Run after changing `DATABASE_URL` or pulling backend schema changes. |
| `./scripts/seed.sh` | Loads the small sample session and three sample participants. | Quick demo or smoke test. |
| `./scripts/generate-test-people.sh` | Loads the larger synthetic participant batch. | Local testing with realistic volume. |
| `./scripts/clear-dummy-data.sh` | Previews or deletes seed/synthetic demo data. | Run without flags first, then use `--yes` only after checking the preview. |
| `./scripts/create-session.sh` | Creates or updates a chapter session. | New chapter/session setup. |
| `./scripts/setup-db-viewer.sh` | Starts pgAdmin in Docker and preloads an LDC database connection. | Give an operator a browser-based database viewer. |
| `./scripts/build-operator-guide.py` | Regenerates the printable PDF/ODT setup guide from Markdown. | After editing `docs/chapter-setup-guide.md`. |

Common script commands:

```bash
./scripts/setup.sh
./scripts/dev.sh
./scripts/setup-db-viewer.sh
./scripts/clear-dummy-data.sh
./scripts/clear-dummy-data.sh --yes
./scripts/clear-dummy-data.sh --all-operational-data
./scripts/clear-dummy-data.sh --all-operational-data --yes
./scripts/create-session.sh --name "Fall 2026 - Chapter Name" --starts-on 2026-09-12 --location "Parish Hall" --registration-open --attach-default-intake
```

Destructive commands:

- `./scripts/clear-dummy-data.sh --yes` deletes detected demo/synthetic data.
- `./scripts/clear-dummy-data.sh --all-operational-data --yes` deletes all operational rows, including real participants, sessions, audit logs, and staff users.

Always make a backup before either destructive command on a real database.
