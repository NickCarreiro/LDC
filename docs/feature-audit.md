# Feature and Button Audit

Priority key:

- P0: Required for basic organizer operations
- P1: Important for phase-one workflow completeness
- P2: Useful enhancement or later-phase support

Status key:

- Created: visible page or control exists
- Wired: control performs navigation, scroll, download, search, or an action dialog
- Backend: API/model support exists for persistence or computation

## Dashboard `/`

| Feature/Button | Priority | Created | Wired | Notes |
| --- | --- | --- | --- | --- |
| Search operations | P1 | Yes | Yes | Opens searchable operations dialog. |
| Open Form | P0 | Yes | Yes | Navigates to Summer 2026 form. |
| CSV Export | P0 | Yes | Yes | Downloads dashboard CSV sample. |
| Approve Drafts | P0 | Yes | Yes | Opens approval status dialog; backend match draft status exists. |
| Intake Form card | P0 | Yes | Yes | Navigates to form page. |
| Registration Review card | P0 | Yes | Yes | Navigates to sessions page. |
| Manual Matching card | P0 | Yes | Yes | Navigates to matching page. |
| Export and Audit card | P0 | Yes | Yes | Navigates to audit page. |
| Manage participants | P0 | Yes | Yes | Navigates to participants page. |
| Dry-run selectors | P0 | Yes | Yes | Client-side score updates when selections change. |

## Intake Form `/forms/summer-2026`

| Feature/Button | Priority | Created | Wired | Notes |
| --- | --- | --- | --- | --- |
| Summer 2026 details | P1 | Yes | Yes | Scrolls to form details. |
| 19 fields | P0 | Yes | Yes | Scrolls to field sections. |
| Use for Session | P0 | Yes | Yes | Opens status dialog; template is attached in seed config. |
| Section navigation | P1 | Yes | Yes | Anchors to identity, preferences, commitments, history. |
| Field previews | P0 | Yes | Yes | Inputs, dropdowns, radios, checkboxes, textareas render. |

## Sessions `/sessions`

| Feature/Button | Priority | Created | Wired | Notes |
| --- | --- | --- | --- | --- |
| Edit Intake | P0 | Yes | Yes | Navigates to intake form. |
| New Session | P1 | Yes | Yes | Opens creation workflow dialog. |
| Configure Workflow | P1 | Yes | Yes | Opens workflow configuration dialog. |
| Cohort timeline | P0 | Yes | Yes | Shows size, balance, status, repeat percentages. |

## Participants `/participants`

| Feature/Button | Priority | Created | Wired | Notes |
| --- | --- | --- | --- | --- |
| Search | P0 | Yes | Yes | Opens participant search dialog. |
| Export CSV | P0 | Yes | Yes | Downloads participant CSV sample. |
| Add Participant | P0 | Yes | Yes | Opens creation workflow dialog. |
| Registration Fields | P1 | Yes | Yes | Navigates to intake form. |
| View sensitive record | P0 | Yes | Yes | Opens audit-oriented access dialog. |
| Profile panel | P0 | Yes | Yes | Shows contact, sessions, history, vision, constraints. |

## Matching `/matching`

| Feature/Button | Priority | Created | Wired | Notes |
| --- | --- | --- | --- | --- |
| Generate Recommendations | P0 | Yes | Yes | Opens recommendation workflow dialog; backend route exists. |
| Add Manual Match | P0 | Yes | Yes | Opens manual match workflow dialog. |
| Person selectors | P0 | Yes | Yes | Updates dry-run score, shared interests, vision, history, constraints. |
| Draft curation sheet | P0 | Yes | Yes | Shows score, source, warnings, status. |

## Draft Emails `/drafts`

| Feature/Button | Priority | Created | Wired | Notes |
| --- | --- | --- | --- | --- |
| Generate Drafts | P0 | Yes | Yes | Opens draft generation dialog; backend email draft builder exists. |
| Send All Approved | P0 | Yes | Yes | Opens batch-send guardrail dialog. |
| Preview/Review per match | P1 | Yes | Yes | Opens pair-specific review dialog. |
| Participant delivery sheet | P1 | Yes | Yes | Shows per-person match and eligibility state. |

## Audit `/audit`

| Feature/Button | Priority | Created | Wired | Notes |
| --- | --- | --- | --- | --- |
| Export Audit Log | P0 | Yes | Yes | Downloads audit CSV sample. |
| Review Roles | P0 | Yes | Yes | Opens RBAC role dialog. |
| Event stream | P0 | Yes | Yes | Shows actor, action, object, sensitivity, time. |
| Governance checks | P0 | Yes | Yes | Shows encryption, statements, exports, RBAC checks. |

## Backend Support Snapshot

| Area | Priority | Created | Notes |
| --- | --- | --- | --- |
| Participants API | P0 | Yes | CRUD/list/view/export routes exist. |
| Sessions API | P0 | Yes | Session creation and registration creation exist. |
| Matching API | P0 | Yes | Dry-run, draft creation, recommendations, email prep exist. |
| Intake form template API | P0 | Yes | Summer 2026 template endpoint exists. |
| Audit log model | P0 | Yes | Sensitive list/view/export/match actions are logged in API routes. |
| AES-256-GCM encrypted field type | P0 | Yes | Contact, notes, feedback, vision fields use encrypted type. |

## Remaining Development Work

1. P0: Replace sample frontend data with API-backed reads and mutations.
2. P0: Implement real create/edit forms for participants, sessions, registrations, and match drafts.
3. P0: Wire Keycloak token validation instead of local dev headers.
4. P0: Persist form submissions from the public/live site into participant and registration records.
5. P1: Add server-side email send batching with Mailhog/local SMTP previews.
6. P1: Add file upload storage for profile photos.
7. P1: Add configurable form builder fields beyond the Summer 2026 template.
8. P2: Add AI-assisted note summarization and trend extraction after enough data exists.
