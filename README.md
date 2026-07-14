# LDC Operations System

Internal Catholic matchmaking operations platform for organizers, matchmakers, and trusted ministry leaders. This is not a public dating app. It is a localhost-first foundation for structured participant intake, session management, relationship history, manual matching, and later compatibility analysis.

## Local Stack

- `frontend/`: Next.js organizer console
- `backend/`: FastAPI service
- `postgres`: relational storage
- `keycloak`: local identity provider scaffold
- `mailhog`: local SMTP capture for draft/send workflows

## Quick Start

```bash
cp .env.example .env
./scripts/setup.sh
./scripts/generate-test-people.sh
./scripts/dev.sh
```

Useful local URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- Keycloak: http://localhost:8080
- Mailhog: http://localhost:8025

`./scripts/generate-test-people.sh` loads an idempotent synthetic batch of at least 250 participants, vision statements, registrations, date history, and match drafts for local testing.

## Database Operations

See [docs/database-operations.md](docs/database-operations.md) for database access, pgAdmin viewer setup, dummy-data cleanup, and chapter session setup.

For non-technical chapter operators, use the hand-holding guide in:

- [docs/chapter-operator-handoff.pdf](docs/chapter-operator-handoff.pdf)
- [docs/chapter-operator-handoff.odt](docs/chapter-operator-handoff.odt)
- [docs/chapter-operator-handoff.md](docs/chapter-operator-handoff.md)

Common commands:

```bash
./scripts/setup-db-viewer.sh
./scripts/clear-dummy-data.sh          # dry run
./scripts/clear-dummy-data.sh --yes
./scripts/create-session.sh --name "Fall 2026 - Chapter Name" --starts-on 2026-09-12 --location "Parish Hall" --registration-open --attach-default-intake
```

## Development Phases

### Phase 1: Operations Foundation

- Secure authentication and role-based access control hooks
- Participant data entry with structured and flexible profile fields
- Session registration tracking
- Manual match curation
- Audit logging for sensitive organizer activity
- Local setup scripts and service containers

### Phase 2: Relationship Intelligence

- Session-to-session feedback tracking
- Vision statement version history
- Date history and follow-up actions
- Repeat participant and gender balance reporting
- Configurable review pipelines and reporting views

### Phase 3: Analytics and Assistance

- Configurable compatibility scoring
- Recommendation engines based on real outcomes
- Event coordination and curation-sheet workflows
- Organizer-assistive note summarization and trend extraction

## Security Posture

The backend includes the beginning of an encryption boundary for sensitive fields using AES-256-GCM. Local development uses generated defaults, but real deployments must provision secrets through a secret manager or encrypted environment configuration. Treat participant records, pastoral notes, and relationship history as highly sensitive data.

## Current Scope

This scaffold is intentionally organizer-first. Participant self-service, swipe mechanics, public browsing, and automated final matching are out of scope. The system can compute recommendations, but organizers remain responsible for all decisions.
# LDC
