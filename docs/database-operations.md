# LDC Database Operations Guide

This guide is for a new organizer, chapter operator, or developer who needs to run LDC with their own PostgreSQL database, inspect it with a database viewer, clear demo data, and create their own program sessions.

The database stores participant contact details, pastoral notes, relationship history, curation drafts, and audit logs. Treat every non-demo database as sensitive.

## 1. What Runs Where

The LDC stack has two persistence paths:

- PostgreSQL stores backend records: participants, sessions, registrations, date history, match drafts, staff users, and audit logs.
- The current frontend also uses browser storage for some organizer-console state. It starts empty by default, unless `NEXT_PUBLIC_LOAD_SAMPLE_DATA=true` is set for demos.

Important local defaults:

| Setting | Default |
| --- | --- |
| Database name | `ldc` |
| Database user | `ldc` |
| Database password | `ldc_dev_password` |
| Local system Postgres port | `5432` |
| Docker Compose Postgres host port | `5433` from `.env.example` |
| Backend API | `http://localhost:8000` |
| Frontend | `http://localhost:3000` |
| pgAdmin viewer | `http://localhost:5050` |

The active backend connection comes from `DATABASE_URL` in `.env`.

Example:

```bash
DATABASE_URL=postgresql+psycopg://ldc:ldc_dev_password@localhost:5432/ldc
```

## 2. Fresh Local Setup

From a clean clone:

```bash
./scripts/bootstrap.sh
```

That is the recommended handoff path. It prompts for database credentials, organizer login, pgAdmin login, SMTP settings, and whether to load browser-side sample data. It then writes `.env`, creates the PostgreSQL user/database, initializes tables, installs dependencies, builds the frontend, and can start pgAdmin.

If `.env` already exists, bootstrap pre-fills non-secret prompts and lets the operator press Enter to preserve existing secret values, including the SMTP app password.

Manual setup path:

```bash
cp .env.example .env
./scripts/setup.sh
```

`setup.sh` installs backend and frontend dependencies, creates the local PostgreSQL database/user when needed, writes a local `DATABASE_URL`, initializes tables, builds the frontend, and starts the app.

For Docker-based supporting services:

```bash
./scripts/dev.sh
```

For schema-only initialization after changing `DATABASE_URL`:

```bash
./scripts/migrate.sh
```

To load demo data:

```bash
./scripts/seed.sh
./scripts/generate-test-people.sh
```

## 3. Direct Database Access

Use `psql` when you need a terminal connection.

Local system Postgres:

```bash
psql "postgresql://ldc:ldc_dev_password@localhost:5432/ldc"
```

Docker Compose Postgres from `.env.example`:

```bash
psql "postgresql://ldc:ldc_dev_password@localhost:5433/ldc"
```

Common read-only checks:

```sql
\dt
select count(*) from participants;
select name, starts_on, registration_open from program_sessions order by starts_on desc nulls last;
select status, count(*) from session_registrations group by status order by status;
```

Sensitive fields such as email, phone, vision statements, notes, and feedback use the app's encryption type. Prefer app/API workflows for normal operations.

## 4. Database Viewer Setup

The repo includes a pgAdmin setup script. It runs pgAdmin in Docker and preloads an `LDC PostgreSQL` server connection.

Default setup:

```bash
./scripts/setup-db-viewer.sh
```

Then open:

```text
http://localhost:5050
```

Default login:

```text
admin@ldc.local
ldc_pgadmin_change_me
```

Use a real password for anything shared:

```bash
PGADMIN_PASSWORD='replace-with-a-long-password' ./scripts/setup-db-viewer.sh --replace
```

If your database is on Docker Compose's default host port:

```bash
DB_PORT=5433 ./scripts/setup-db-viewer.sh --replace
```

If your database is remote:

```bash
DB_HOST=db.example.org \
DB_PORT=5432 \
DB_NAME=ldc \
DB_USER=ldc_reader \
DB_PASSWORD='replace-me' \
PGADMIN_PASSWORD='replace-with-a-long-password' \
./scripts/setup-db-viewer.sh --replace
```

The script writes local pgAdmin connection files under `.local/pgadmin/`; keep that directory out of git because it contains a generated `pgpass` file.

## 5. Back Up Before Destructive Work

Before clearing data or handing a database to a new operator, take a backup.

Local system Postgres:

```bash
pg_dump "postgresql://ldc:ldc_dev_password@localhost:5432/ldc" \
  --format=custom \
  --file "ldc-backup-$(date +%Y%m%d%H%M%S).dump"
```

Docker Compose Postgres:

```bash
pg_dump "postgresql://ldc:ldc_dev_password@localhost:5433/ldc" \
  --format=custom \
  --file "ldc-backup-$(date +%Y%m%d%H%M%S).dump"
```

Restore into an empty database:

```bash
pg_restore \
  --dbname "postgresql://ldc:ldc_dev_password@localhost:5432/ldc" \
  --clean \
  --if-exists \
  ldc-backup-YYYYMMDDHHMMSS.dump
```

## 6. Clear Demo Data

The cleanup script removes records created by:

- `backend/app/db/seed.py`, the small three-person sample.
- `backend/app/db/generate_people.py`, the large synthetic batch.

Dry run:

```bash
./scripts/clear-dummy-data.sh
```

Delete selected dummy data:

```bash
./scripts/clear-dummy-data.sh --yes
```

Keep the generated `Summer 2026`, `Spring 2026`, and `Winter 2026` session shells while deleting dummy participants and their dependent records:

```bash
./scripts/clear-dummy-data.sh --keep-generated-sessions --yes
```

If no known demo records are detected but this is a fresh chapter handoff and you intentionally want an empty operational database, preview a full cleanup:

```bash
./scripts/clear-dummy-data.sh --all-operational-data
```

Then delete all operational rows only after confirming the preview and making a backup:

```bash
./scripts/clear-dummy-data.sh --all-operational-data --yes
```

The script deletes dependent records in this order: match drafts, date history, registrations, vision statement versions, participants, then selected sessions.

Do not run this against production unless you have confirmed the selection in dry-run output and have a backup.

If participants are still visible in the organizer console after cleanup, they are likely old browser-side sample data. Pull the latest code, rebuild/restart the frontend, and reload the browser. If needed, clear browser storage for the frontend origin.

## 7. In-App Imports And Browser-Side Sessions

Open `Audit` and use `Data Management` for browser-side import workflows.

The in-app importer accepts CSV and Excel `.xlsx` files. For LDC signup workbooks, it scans the workbook sheets and uses the populated `Form Responses` sheet when present. It maps the current LDC signup columns for name, email, phone, gender, age, location, interests, maximum dates, age range, previous dates, cannot-date names, vision, welcome email, orientation date, card, RSVP, and notes.

The importer detects the session from a session column or from the file name, such as `Fall 2024`, `Spring 2025`, `DMV Spring 2026`, or `DMV Summer 2026`. The detected session appears in the `Import into session` dropdown. If that browser-side session does not already exist, clicking `Import Previewed Rows` creates it and assigns imported participants to it. Choose a different dropdown value before import if the detected session is not the intended one.

## 8. Set Up A Chapter's Own Sessions

Each chapter should create its own `program_sessions` records instead of reusing demo sessions.

Create a session with the default intake form attached:

```bash
./scripts/create-session.sh \
  --name "Fall 2026 - Your Chapter" \
  --starts-on 2026-09-12 \
  --location "Your Parish Hall" \
  --registration-open \
  --attach-default-intake
```

Create or update a closed planning session:

```bash
./scripts/create-session.sh \
  --name "Winter 2027 - Your Chapter" \
  --starts-on 2027-01-10 \
  --location "TBD" \
  --attach-default-intake
```

The command is idempotent by session name: if the name already exists, it updates that session.

After creating a session, verify it:

```bash
psql "postgresql://ldc:ldc_dev_password@localhost:5432/ldc" \
  -c "select name, starts_on, location_label, registration_open from program_sessions order by created_at desc limit 5;"
```

Chapter setup checklist:

1. Choose a unique session name that includes the chapter or city.
2. Set `starts_on` to the first session event date.
3. Set `location_label` to the public-facing location label.
4. Use `--registration-open` only when intake should be active.
5. Attach the default intake form, then customize form copy in code or through a future admin workflow.
6. Add participants through the backend/API or approved intake flow.
7. Run match recommendation and curation workflows only after registrations are reviewed.

## 9. Troubleshooting

If `psql` cannot connect:

- Confirm Postgres is running: `sudo systemctl status postgresql` for system Postgres, or `docker compose ps postgres` for Docker Compose.
- Confirm the port in `.env`: `rg '^DATABASE_URL|^POSTGRES_HOST_PORT' .env`.
- Confirm the database exists: `sudo -u postgres psql -l` on a system Postgres install.

If pgAdmin opens but the server connection fails:

- For system Postgres on Linux, keep `DB_HOST=host.docker.internal`.
- For Docker Compose Postgres exposed on the host, set `DB_PORT=5433` unless your `.env` changed it.
- For a remote database, explicitly pass `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- Recreate the pgAdmin container after changing connection details: `./scripts/setup-db-viewer.sh --replace`.

If the app still shows old dummy data after the PostgreSQL cleanup:

- Clear the browser's local storage for the frontend origin.
- Sign out and back in.
- Restart the frontend if it was running while you changed backend data.

## 10. Handoff Checklist For Another Operator

Give the operator:

- The repository URL.
- The database host, port, name, username, and password if they are connecting to an existing database.
- The pgAdmin URL and pgAdmin login if you run it for them.
- The SMTP address and app password if they are using an existing email account.
- A reminder that participant records and notes are sensitive.

Have them run:

```bash
./scripts/bootstrap.sh
./scripts/setup-db-viewer.sh
./scripts/create-session.sh --name "Fall 2026 - Chapter Name" --starts-on 2026-09-12 --location "Parish Hall" --registration-open --attach-default-intake
```

Then confirm:

```bash
./scripts/clear-dummy-data.sh
curl http://localhost:8000/health
```
