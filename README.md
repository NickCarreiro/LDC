# LDC Operations System

LDC is an organizer-first operations system for Catholic matchmaking chapters. It is not a public dating app and it does not make final match decisions automatically. It helps trusted organizers manage intake, sessions, participants, date history, match drafts, email drafts, and audit/review workflows.

This README is the main usage guide for setting up and operating the site. For a printable chapter handoff, use:

- [Chapter Setup Guide PDF](docs/chapter-setup-guide.pdf)
- [Chapter Setup Guide ODT](docs/chapter-setup-guide.odt)
- [Chapter Setup Guide Markdown](docs/chapter-setup-guide.md)

For deeper database administration, use [docs/database-operations.md](docs/database-operations.md).

## Fastest Fresh Setup

On a new machine, clone the repo and run the interactive bootstrap:

```bash
git clone https://github.com/NickCarreiro/LDC.git
cd LDC
./scripts/bootstrap.sh
```

The bootstrap prompts for:

- PostgreSQL database name, user, password, and port.
- Organizer website password.
- pgAdmin email and password.
- SMTP host, port, from email, display name, username, and app password.
- Whether to load browser-side sample data.

It then writes `.env`, creates the database, installs dependencies, initializes tables, builds the frontend, and optionally starts pgAdmin.

If `.env` already exists, bootstrap pre-fills non-secret prompts and lets the operator press Enter to keep existing secret values, including `SMTP_PASS` and `SMTP_APP_PASSWORD`.

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
- `/audit`: review audit/access-control information, import CSV/XLSX files, clear browser-side session data, and manage SMTP-related local settings.

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
- Some frontend console data still uses browser storage/local state. The console starts empty unless `NEXT_PUBLIC_LOAD_SAMPLE_DATA=true` is set.

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
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=organizers@example.org
SMTP_FROM_NAME=Little Dates Club
SMTP_USER=organizers@example.org
SMTP_PASS=REPLACE_WITH_SMTP_APP_PASSWORD
SMTP_USERNAME=organizers@example.org
SMTP_APP_PASSWORD=REPLACE_WITH_SMTP_APP_PASSWORD
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

`SMTP_USER`/`SMTP_PASS` are kept for compatibility with older setup files. `SMTP_USERNAME`/`SMTP_APP_PASSWORD` are the preferred names. The Audit page loads these values from the protected `/api/smtp/config` route when browser-local SMTP settings have not already been saved.

Frontend organizer login also expects these values when running the deployed/protected console:

```text
ORGANIZER_PASS=replace-with-organizer-password
SESSION_SECRET=replace-with-long-random-session-secret
```

The frontend console starts empty by default. To intentionally load the built-in browser-side sample participants and sessions for a demo, add:

```text
NEXT_PUBLIC_LOAD_SAMPLE_DATA=true
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

Recommended for a brand-new operator:

```bash
./scripts/bootstrap.sh
```

Manual setup path:

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

`setup.sh` uses values already present in `.env`. Use `bootstrap.sh` when the operator needs to be prompted for passwords and credentials.

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

If participants still appear in the browser after cleanup, pull the latest code and reload the site. This release bumps the frontend storage schema and clears older browser-side sample data. If needed, manually clear browser storage for `localhost:3000`.

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
2. Run `./scripts/bootstrap.sh`.
3. Run `./scripts/setup-db-viewer.sh` if pgAdmin was skipped during bootstrap.
4. Preview and remove demo data.
5. Create the chapter session.
6. Confirm the session in pgAdmin or `psql`.
7. Add or import participants through approved app/API workflows.
8. Review registrations before using matching workflows.

## Using The Organizer Console

1. Open `http://localhost:3000`.
2. Sign in with the organizer password.
3. Use `Sessions` to confirm the active session.
4. Use `Participants` to review participant records, contact fields, preferences, and notes.
5. Use `Matching Workbench` to score possible pairs and draft recommendations.
6. Use `Curation Table` to review matchups and date history.
7. Use `Draft Emails` to prepare communication drafts.
8. Use `Audit` to review access/audit information, import CSV/XLSX files, clear browser-side data, manage local SMTP settings, and check that the SMTP relay is reachable.

Draft emails list each approved date with that date's phone number. If a participant has no phone number on file, the draft says `phone not listed` so the operator can fix it before sending.

Organizers remain responsible for final decisions. Scores and drafts are support tools.

## In-App Data Management

Open `Audit` and use the `Data Management` panel for browser-side console data.

Available actions:

- `Import Previewed Rows`: imports the currently previewed participant rows.
- `Clear Participant Data`: clears browser-side participants, match drafts, generated emails, and display names while keeping sessions.
- `Clear Sessions Too`: clears browser-side sessions plus participants, match drafts, generated emails, and display names.

The clear buttons require typing `CLEAR` before they run.

Import accepts `.csv` and `.xlsx` files. For LDC signup workbooks, the importer scans workbook sheets and uses the first populated `Form Responses` sheet when present. It recognizes the current LDC form columns such as first/last name, full name, email, phone, gender, age, location, interests, max dates, age range, previous dates, cannot-date names, vision, welcome email, orientation date, card, RSVP, and notes.

The importer also detects the session from the workbook filename or a session column. Examples: `Fall 2024`, `Spring 2025`, `DMV Spring 2026`, and `DMV Summer 2026`. The detected session appears in the `Import into session` dropdown before import. If that session does not already exist in the browser-side console data, `Import Previewed Rows` creates it automatically and sets the imported participants to that session. If the detected session is wrong, choose a different session in the dropdown before clicking import.

Prior date history is imported conservatively. Clearly separated names become separate history entries. Messy free-text history is preserved for review and appears as `Review manually` unless it exactly matches a current participant name.

Imported gender values such as `Male`/`Female` are normalized for the matching engine, so `Generate Recommendations` works with imported workbook data as well as native demo data.

Database cleanup and browser-side cleanup are separate:

- Use `./scripts/clear-dummy-data.sh` for PostgreSQL records.
- Use `Audit > Data Management` for browser-side console records.

For email setup, use `Audit > SMTP - Gmail > Check Relay` after entering the SMTP host, Gmail address, port, and app password. The check runs from the server and confirms that the SMTP relay answers.

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

## Domain Name And Elastic IP Setup

Use this when a chapter wants a real domain such as `example.org` or `www.example.org` to open the LDC site.

Official references:

- AWS Elastic IP documentation: `https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html`
- AWS security group web-server rules: `https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html`
- Wix DNS records guide: `https://support.wix.com/en/article/managing-dns-records-in-your-wix-account`
- Wix A record guide: `https://support.wix.com/en/article/adding-or-updating-a-records-in-your-wix-account`

### 1. Allocate And Attach An AWS Elastic IP

The site should not depend on the EC2 instance's temporary public IP. In AWS:

1. Open the AWS Console.
2. Go to `EC2`.
3. Make sure the region is the same region as the LDC server.
4. In the left menu, open `Network & Security > Elastic IPs`.
5. Click `Allocate Elastic IP address`.
6. Use Amazon's IPv4 address pool unless the technical owner has a different requirement.
7. Click `Allocate`.
8. Select the new Elastic IP.
9. Choose `Actions > Associate Elastic IP address`.
10. Resource type: `Instance`.
11. Select the LDC EC2 instance.
12. Select the private IP shown for that instance.
13. Click `Associate`.

Copy the allocated Elastic IP address. This is the public IP the domain will point to.

Important: AWS can charge for unused or unattached Elastic IP addresses. Keep the Elastic IP associated with the running instance, or release it when the server is permanently retired.

### 2. Open Web Traffic In The EC2 Security Group

In AWS, open the security group attached to the LDC EC2 instance and confirm these inbound rules:

| Type | Protocol | Port | Source |
| --- | --- | --- | --- |
| HTTP | TCP | `80` | `0.0.0.0/0` |
| HTTPS | TCP | `443` | `0.0.0.0/0` |
| SSH | TCP | `22` | The technical helper's IP only, not `0.0.0.0/0` |

Do not expose PostgreSQL (`5432` or `5433`) to the internet.

Before touching DNS, verify the Elastic IP reaches the server:

```bash
curl -I http://ELASTIC_IP_ADDRESS
```

The response should come from Nginx or the app server. If it times out, fix AWS security group, Nginx, or service health before changing Wix DNS.

### 3. Point The Wix Domain To The Elastic IP

In Wix:

1. Log in to the Wix account that owns the domain.
2. Go to `Domains`.
3. Click the domain's `Domain Actions` menu.
4. Choose `Manage DNS Records`.
5. Find the `A` record for the root domain. This may be shown as `@`, the bare domain, or the domain name itself.
6. Edit that `A` record so it points to the AWS Elastic IP.
7. Add or edit `www`:
   - Preferred: add a `CNAME` record with host `www` pointing to the root domain, such as `example.org`.
   - If Wix does not allow that for this domain, add an `A` record with host `www` pointing to the same Elastic IP.
8. Remove old/conflicting Wix default A records only after confirming they are for the same root or `www` host.
9. Save the DNS changes.

Typical records:

| Host | Type | Value |
| --- | --- | --- |
| `@` | `A` | The AWS Elastic IP |
| `www` | `CNAME` | The root domain, for example `example.org` |

DNS can update in minutes, but it can also take up to 24-48 hours depending on resolver caches.

### 4. Configure The Server Domain

On the server, Nginx should accept the new domain and proxy traffic to the frontend service on port `3001`.

Typical Nginx values:

```nginx
server_name example.org www.example.org;
proxy_pass http://127.0.0.1:3001;
```

The app environment should use the public domain:

```text
BACKEND_CORS_ORIGINS=https://example.org
NEXT_PUBLIC_API_BASE_URL=https://example.org
```

After DNS points to the Elastic IP, the technical helper should install or renew HTTPS certificates for the domain, usually with Certbot/Nginx. Do not mark the handoff complete until `https://example.org` and `https://www.example.org` both load correctly.

Verification commands:

```bash
dig +short example.org
dig +short www.example.org
curl -I http://example.org
curl -I https://example.org
systemctl status ldc-frontend.service --no-pager
```

The `dig` output should show the Elastic IP for the root domain. `www` may show either the Elastic IP or a CNAME that resolves to it.

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

- Pull the latest code and rebuild/restart the frontend.
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
| `./scripts/bootstrap.sh` | Interactive first-time setup. Prompts for database, organizer, pgAdmin, and SMTP credentials, writes `.env`, creates the DB, installs dependencies, initializes tables, and builds the frontend. | Best option for a fresh GitHub clone. |
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
