# Architecture

## System Shape

CLINIK AI uses a Next.js monolith: server-rendered dashboard pages, API route handlers, Prisma/PostgreSQL persistence, Valkey-backed cache, and an AI service layer. This keeps the project deployable on a single VPS or container platform while preserving clean backend boundaries.

## Layers

- `app/`: Next.js routes and API endpoints.
- `components/`: Reusable UI components and client-side AI workbench.
- `lib/security`: JWT session cookies and role-based access control.
- `lib/ai`: provider interface, prompt templates, guardrails, embeddings, semantic search, and AI generation persistence.
- `lib/observability.ts`: request IDs, token estimates, and small telemetry helpers used by AI and admin operations surfaces.
- `lib/jobs.ts`: document chunking and embedding worker logic. The current implementation runs inline for demo simplicity but is written as a job boundary.
- `prisma/`: schema, migration, and seed data.

## Data Model

Core entities:

- Clinics own users and clinical records.
- Users have roles: `DOCTOR`, `CLINIC_ADMIN`, `ASSISTANT`.
- Assistants are operational users: they can schedule, upload documents, manage tasks/follow-ups, and triage portal requests, but cannot review clinical AI drafts, access settings/admin screens, or export patient charts.
- Users also store active state, failed-login count, temporary lockout expiry, and last-login timestamp for admin security review.
- Patients contain demo-only demographics, conditions, medications, allergies, and risk score.
- Consultations store raw notes, summaries, SOAP JSON, status, and sign-off fields.
- Appointments schedule patient visits with clinician ownership, status, time window, location, and notes.
- Patient portal requests link verified patient messages to the clinic queue with workflow status, audited comments, AI reply-assist drafts, and staff reply notifications.
- Patient portal tokens are hashed, single-use, time-limited records used for email magic-link access to a separate patient portal session.
- Staff account changes and appointment status updates are handled through audited route handlers with role checks.
- Documents store extraction results, chunks, and parsed JSON.
- Documents also store storage provider, local storage key, file size, checksum, and scan status.
- Embeddings link searchable note/document content to patients.
- AI generations store provider/model/prompt metadata, source context, JSON output, raw output, review state, and reviewer details.
- AI generations also store latency, cache-hit state, token estimates, and request IDs for production observability.
- Audit logs capture sensitive actions and AI generation events.

## Request Flow

1. User signs in through `/api/auth/login`.
2. API routes call `requireUser()` and role checks where needed.
3. Mutating routes validate input with Zod.
4. Clinical writes create audit log records.
5. Middleware attaches `X-Request-Id` for app/API traceability.
6. Login attempts apply rate limiting, known-account lockout policy, and audit metadata.
7. AI routes build patient context, call the AI service, validate output, store draft metadata and telemetry, and return structured JSON.
8. Document uploads chunk/embed text and automatically create doctor-review-required AI triage drafts for document parsing, risk flags, and task candidates.
9. Public patient portal routes verify MRN and date of birth or issue a secure email magic link, return limited portal-safe data, and let patients create clinic requests. Magic-link sessions also allow patients to continue request conversations.
10. Inbox signals are derived from persisted workflow state instead of a separate notification table, keeping demo data explainable and auditable.
11. Patient chart exports require a reason, can redact direct contact details, and are recorded in the audit log.

## Testing Shape

- Unit and component tests cover AI guardrails, validation, security policy, storage helpers, and shared UI.
- Playwright smoke tests cover seeded login, dashboard navigation, patient export privacy, documents, schedule, inbox, staff surfaces, and patient portal submission.

## Deployment Topology

Recommended production topology:

- App container running Next.js.
- Managed PostgreSQL or local containerized PostgreSQL.
- Managed Redis/Valkey or local Valkey.
- Local Ollama on the same VPS or clinic server when PHI should remain local.
- External providers only after clinic policy approval and explicit configuration.
