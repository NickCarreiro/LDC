# Product Foundation

## Audience

This system is for organizers, matchmakers, and trusted ministry leaders. It should never feel like a public dating app. The primary workflows are data stewardship, discernment support, session operations, and manual match curation.

## Core Objects

- Participant profile: identity, contact information, age range, interests, vision statement, photo, constraints, sensitive pastoral context
- Program session: intake window, registrations, fees, attendance, feedback, dates, follow-up tasks
- Vision statement version: historical statement text, classification tags, reviewer notes, timestamp
- Date history: pair, session, outcome, feedback, organizer notes
- Match draft: manual or algorithm-assisted pairing, score breakdown, curation status, email draft status
- Audit log: who viewed or changed sensitive operational records

## Guardrails

- Human organizers make final matching decisions.
- Algorithmic output is advisory and explainable.
- Sensitive data must be encrypted at rest.
- Audit logs should track reads and writes on sensitive records.
- Access should be role-based and least-privilege.
- Flexible fields should exist early because the final operating model is still being discovered.
