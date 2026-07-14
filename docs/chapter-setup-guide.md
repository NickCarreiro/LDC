# LDC Chapter Setup Guide

This guide is for chapter operators setting up LDC for the first time. Follow the steps in order. If something fails, stop and send the exact error message to the person helping you.

## What You Are Setting Up

You are setting up three things:

1. The LDC app, where organizers manage participants and sessions.
2. The PostgreSQL database, where the app stores records.
3. pgAdmin, a database viewer that lets you inspect the database in a browser.

You do not need to work inside the database for normal setup. Most steps are copy-and-run commands.

## Before You Start

Ask your technical helper for:

- The GitHub repository link.
- The `.env` file or the exact database settings to put in `.env`.
- The database password.
- The organizer login password for the site.
- The name, date, and location for your chapter's first session.

Do not send passwords through regular email or text if you can avoid it. Use a password manager, secure note, or phone call.

## Open A Terminal

On Mac:

1. Open Spotlight with Command + Space.
2. Type `Terminal`.
3. Press Enter.

On Windows:

1. Install Windows Terminal if you do not already have it.
2. Open Windows Terminal.
3. Use the Ubuntu/Linux tab if this project was set up through WSL.

On Linux:

1. Open the Terminal app.

## Get The Code

Your helper may do this part for you. If not, run:

```bash
git clone https://github.com/NickCarreiro/LDC.git
cd LDC
```

If the folder already exists:

```bash
cd LDC
git pull
```

## Create The Settings File

Run:

```bash
cp .env.example .env
```

Then open `.env` in a text editor. Your helper should tell you what values to use.

The most important line is `DATABASE_URL`. It usually looks like this:

```text
DATABASE_URL=postgresql+psycopg://ldc:ldc_dev_password@localhost:5432/ldc
```

If your helper gave you a different database host, port, username, or password, use what they gave you.

## Start The App

Run:

```bash
./scripts/setup.sh
```

This can take several minutes. It installs tools, prepares the database, builds the website, and starts the services.

When it is done, open:

```text
http://localhost:3000
```

If the page asks for a password, use the organizer password your helper gave you.

## Open The Database Viewer

Run:

```bash
./scripts/setup-db-viewer.sh
```

Then open:

```text
http://localhost:5050
```

Use this login unless your helper gave you a different one:

```text
Email: admin@ldc.local
Password: ldc_pgadmin_change_me
```

Important: if this is more than a private local test, ask your helper to set a stronger pgAdmin password.

Inside pgAdmin:

1. Look at the left sidebar.
2. Expand `Servers`.
3. Click `LDC PostgreSQL`.
4. If it asks for a password, use the database password from `.env`.
5. Expand `Databases`.
6. Expand `ldc`.
7. Expand `Schemas`.
8. Expand `public`.
9. Expand `Tables`.

The most useful tables are:

- `program_sessions`: chapter sessions.
- `participants`: participant records.
- `session_registrations`: who registered for which session.
- `match_drafts`: draft matches.
- `date_history`: previous date history.

To view a table:

1. Right-click the table.
2. Choose `View/Edit Data`.
3. Choose `All Rows`.

Do not edit database rows directly unless your helper tells you to. Viewing is safer than editing.

## Remove Demo Data

First run a preview:

```bash
./scripts/clear-dummy-data.sh
```

Read the numbers it prints. This command does not delete anything.

If the preview looks right, run:

```bash
./scripts/clear-dummy-data.sh --yes
```

This removes the sample people and synthetic test data that are only meant for demos.

If you want to keep the sample session names but remove sample people, run:

```bash
./scripts/clear-dummy-data.sh --keep-generated-sessions --yes
```

If you are unsure, stop and ask your helper before using `--yes`.

If the preview says it found zero demo records, but your helper wants a fully empty chapter database, run:

```bash
./scripts/clear-dummy-data.sh --all-operational-data
```

That is still only a preview. If your helper confirms the numbers and you have a backup, run:

```bash
./scripts/clear-dummy-data.sh --all-operational-data --yes
```

## Create Your Chapter Session

Choose:

- A session name.
- A start date.
- A location label.
- Whether registration should be open now.

Example:

```bash
./scripts/create-session.sh \
  --name "Fall 2026 - Your Chapter" \
  --starts-on 2026-09-12 \
  --location "Your Parish Hall" \
  --registration-open \
  --attach-default-intake
```

Replace:

- `Fall 2026 - Your Chapter` with your real session name.
- `2026-09-12` with your real date.
- `Your Parish Hall` with your real location.

If registration is not open yet, remove the `--registration-open` line.

To confirm the session exists, open pgAdmin and look in the `program_sessions` table.

## Everyday Startup

If everything is already installed and you just need to start working, run:

```bash
./scripts/dev.sh
```

Then open:

```text
http://localhost:3000
```

If your helper set up system services instead, they may give you a different startup command.

## Make A Backup Before Big Changes

Before deleting data, importing real participants, or changing session setup, make a backup:

```bash
pg_dump "postgresql://ldc:ldc_dev_password@localhost:5432/ldc" \
  --format=custom \
  --file "ldc-backup-$(date +%Y%m%d%H%M%S).dump"
```

If your `.env` uses a different database password or port, ask your helper for the exact backup command.

Keep backups somewhere private. They may contain sensitive participant information.

## What To Send Your Helper If Something Breaks

Send these four things:

1. What you were trying to do.
2. The command you ran.
3. The full error message.
4. A screenshot if the problem happened in the browser.

Do not send the `.env` file or database password in a group chat.

## Common Problems

Problem: `permission denied`

Try:

```bash
chmod +x scripts/*.sh
```

Then run the command again.

Problem: `database does not exist` or `connection refused`

The database is not running or `.env` points to the wrong place. Send the error to your helper.

Problem: pgAdmin opens but cannot connect to `LDC PostgreSQL`

Run:

```bash
./scripts/setup-db-viewer.sh --replace
```

If it still fails, send your helper the error from pgAdmin.

Problem: The app still shows old sample people after clearing demo data

Try signing out and back in. If that does not work, clear the browser storage for `localhost:3000` and reload the page.

Problem: You typed the wrong session name or date

Run `create-session.sh` again with the same session name and corrected details. The script updates an existing session when the name matches.

## Safe Rules

- Do not delete real participant data without a backup.
- Do not share `.env`.
- Do not edit pgAdmin rows directly unless asked.
- Do not reuse demo sessions for a real chapter.
- When in doubt, stop and ask.

## Quick Command List

```bash
git pull
cp .env.example .env
./scripts/setup.sh
./scripts/setup-db-viewer.sh
./scripts/clear-dummy-data.sh
./scripts/clear-dummy-data.sh --yes
./scripts/create-session.sh --name "Fall 2026 - Chapter Name" --starts-on 2026-09-12 --location "Parish Hall" --registration-open --attach-default-intake
```
