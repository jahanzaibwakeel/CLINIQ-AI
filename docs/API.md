# API Documentation

All API routes return JSON. Protected endpoints require the `medipilot_session` cookie created by `/api/auth/login`.

## Auth

### `POST /api/auth/login`

Body:

```json
{ "email": "doctor@medipilot.local", "password": "DemoPassword123!" }
```

Known active accounts are temporarily locked after repeated failed password attempts. Lockout and login events are written to the audit log with request metadata.

### `POST /api/auth/logout`

Clears the session.

### `GET /api/auth/me`

Returns the current user or `null`.

### `POST /api/auth/request-password-reset`

Public route that sends a time-limited reset link when the account exists. The response is intentionally generic to avoid email enumeration.

```json
{ "email": "doctor@medipilot.local" }
```

### `POST /api/auth/reset-password`

Completes password reset with a single-use token.

```json
{ "token": "reset-token", "password": "NewPassword1234" }
```

### `POST /api/auth/accept-invite`

Completes staff invitation setup with a single-use invite token and activates the user account.

```json
{ "token": "invite-token", "password": "NewPassword1234" }
```

## Patients

### `GET /api/patients`

Lists clinic patients.

### `POST /api/patients`

Allowed roles: doctor, clinic admin.

Creates a patient record.

### `GET /api/patients/:id`

Returns patient detail, consultations, notes, documents, tasks, follow-ups, and recent AI generations.

### `GET /api/patients/:id/export`

Exports a clinic-scoped patient chart JSON bundle and writes a `PATIENT_CHART_EXPORTED` audit event. Requires query params:

```text
?reason=Care%20coordination%20review&redacted=true
```

## Consultations

### `GET /api/consultations`

Lists recent consultations.

### `POST /api/consultations`

Allowed role: doctor.

Creates a consultation draft.

## Documents

### `GET /api/documents`

Lists clinical documents.

### `POST /api/documents`

Creates an extracted-text document record, stores the uploaded file payload with checksum and scan metadata, chunks extracted text, embeds chunks, marks processing complete, and creates AI triage drafts for:

- document parsing
- risk flag explanation
- task extraction

All generated triage outputs remain AI drafts until reviewed.

If processing fails, the document status is set to `FAILED` and a `DOCUMENT_PROCESSING_FAILED` audit event is created.

Optional `fileBase64` may be provided as a browser data URL or raw base64 payload. `extractedText` is still required because it powers local AI parsing and semantic search.

## Tasks

### `GET /api/tasks`

Lists clinic task queue.

### `POST /api/tasks`

Creates a manual task.

### `PATCH /api/tasks/:id`

Updates task status, assignee, or due date.

```json
{ "status": "DONE" }
```

## Follow-ups

### `GET /api/follow-ups`

Lists clinic follow-ups.

### `POST /api/follow-ups`

Schedules a patient follow-up.

```json
{
  "patientId": "patient-id",
  "title": "Lab review",
  "instructions": "Review HbA1c and urine ACR.",
  "scheduledFor": "2026-06-20T10:00:00.000Z"
}
```

### `PATCH /api/follow-ups/:id`

Updates follow-up status.

```json
{ "status": "COMPLETED" }
```

## Appointments

### `GET /api/appointments`

Lists clinic appointments with patient and clinician summaries.

### `POST /api/appointments`

Creates an audited appointment.

```json
{
  "patientId": "patient-id",
  "clinicianId": "optional-user-id",
  "title": "Diabetes lab review",
  "reason": "Review HbA1c and urine ACR.",
  "startsAt": "2026-06-20T10:00:00.000Z",
  "endsAt": "2026-06-20T10:30:00.000Z",
  "location": "Exam room 1",
  "notes": "Bring glucose log."
}
```

### `PATCH /api/appointments/:id`

Updates appointment workflow status.

```json
{ "status": "CHECKED_IN" }
```

Supported statuses: `SCHEDULED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.

## Patient Portal

### `POST /api/portal/lookup`

Public route with CSRF/origin checks and rate limiting. Verifies a patient by MRN and date of birth, then returns portal-safe data only: patient display name, upcoming appointments, open follow-ups, recent document statuses, and reviewed visit summaries.

```json
{ "mrn": "DEMO-1001", "dateOfBirth": "1982-04-12" }
```

### `POST /api/portal/request-link`

Public route with CSRF/origin checks and rate limiting. Verifies MRN, date of birth, and patient email, then sends a hashed, single-use portal magic link. The response is intentionally generic to avoid patient enumeration.

```json
{
  "mrn": "DEMO-1001",
  "dateOfBirth": "1982-04-12",
  "email": "sara.demo@example.com"
}
```

### `GET /portal/access?token=...`

Consumes a valid patient portal token, creates a short-lived patient portal session cookie, writes an audit event, and redirects to `/portal`.

### `GET /api/portal/me`

Returns the same portal-safe patient payload when a valid patient portal session exists, including that patient's recent portal request history and patient-visible comments.

### `POST /api/portal/requests`

Public route with CSRF/origin checks and rate limiting. Re-verifies patient identity before creating a clinic-scoped `PatientPortalRequest` and a public-origin audit log event.
When the patient has an email address, MediPilot sends a request-received notification through the configured SMTP provider or development log fallback.

```json
{
  "patientId": "patient-id",
  "mrn": "DEMO-1001",
  "dateOfBirth": "1982-04-12",
  "type": "APPOINTMENT",
  "subject": "Schedule follow-up",
  "message": "Please help me schedule the requested follow-up appointment.",
  "preferredContact": "+92 300 000 1101"
}
```

Supported request types: `APPOINTMENT`, `MEDICATION_QUESTION`, `DOCUMENT`, `BILLING`, `OTHER`.

### `GET /api/portal/requests`

Allowed roles: doctor, clinic admin, assistant.

Lists recent patient portal requests for the signed-in clinic.

### `PATCH /api/portal/requests/:id`

Allowed roles: doctor, clinic admin, assistant.

Updates portal request workflow status and writes a staff audit event.
When the patient has an email address, MediPilot sends a status update notification.

```json
{ "status": "IN_REVIEW" }
```

Supported statuses: `NEW`, `IN_REVIEW`, `RESOLVED`, `CLOSED`.

### `POST /api/portal/requests/:id/comments`

Creates a patient-visible comment on a portal request. Signed-in staff can reply from `/portal-requests`; patients can reply when signed in through a valid patient portal magic-link session.

```json
{ "body": "We confirmed your follow-up appointment for Friday morning." }
```

Staff replies send patient email notifications when an email address is on file. All replies write audit events.

### `POST /api/portal/requests/:id/draft-reply`

Allowed roles: doctor, clinic admin, assistant.

Generates a patient-safe AI portal reply draft from the portal request and recent conversation. The draft is stored as an `AiGeneration` with provider/model metadata and must be inserted, edited, and sent manually by staff.

```json
{ "instruction": "Acknowledge the request and say scheduling will call." }
```

The response includes `draft`, structured `output`, and generation metadata. It never sends the message automatically.

## Staff

### `POST /api/staff/invitations`

Allowed role: clinic admin.

Creates or re-sends a clinic-scoped staff invitation using hashed, single-use account tokens and the configured email provider.

```json
{
  "email": "new.doctor@example.com",
  "name": "Dr. New Clinician",
  "role": "DOCTOR",
  "title": "Family physician"
}
```

### `PATCH /api/staff/:id`

Allowed role: clinic admin.

Updates staff role, active status, or lockout state with guardrails that preserve at least one active admin and prevent self-deactivation/self-demotion.

```json
{ "role": "DOCTOR", "isActive": true, "resetLockout": true }
```

## AI

### `POST /api/ai/generate`

Runs an AI drafting module and stores an `AiGeneration` row.

Assistants may directly generate only operational drafts: `TASK_EXTRACTION` and `FOLLOW_UP_INSTRUCTIONS`. Doctors and clinic admins can use all configured AI modules, and only doctors/admins can review or apply AI drafts.

Body:

```json
{
  "type": "SOAP_NOTE",
  "patientId": "optional",
  "consultationId": "optional",
  "documentId": "optional",
  "input": "raw doctor notes or document text",
  "question": "optional doctor question"
}
```

Output includes:

- `output`
- `provider`
- `model`
- `generationId`
- `usedFallback`
- `latencyMs`
- `cacheHit`

### `GET /api/ai/status`

Returns the configured AI runtime posture for signed-in users without sending patient data to a model.

Output includes:

- `provider`
- `mode`
- `status`
- `model`
- `embeddingModel`
- `numPredict`
- `modelAvailable`
- `availableModels`
- `message`

### `PATCH /api/ai/generations/:id/review`

Allowed roles: doctor, clinic admin.

Marks an AI draft as reviewed or rejected and writes an audit log.
Reviewed approvals require doctor/admin role; `reviewerNote` is copied into the generation source context and audit metadata. When edited output is supplied, the route stores that reviewed JSON before optional record application.

```json
{
  "reviewStatus": "REVIEWED",
  "reviewerNote": "Optional audit note",
  "output": { "disclaimer": "AI draft, doctor review required.", "summary": "Edited draft" },
  "applyToRecord": true
}
```

When `applyToRecord` is true, supported reviewed outputs can update consultation summaries/SOAP notes, create reviewed tasks or follow-ups, update parsed document data, or store reviewed note content.

### `POST /api/search`

Runs semantic search against embeddings.

```json
{ "query": "microalbuminuria follow up", "patientId": "optional" }
```

## Operations

### `GET /api/health`

Returns process-level health for load balancers and container health checks.

### `GET /api/ready`

Checks readiness by validating database connectivity and cache state. Returns `503` when the app is not ready.

Every app/API response receives an `X-Request-Id` header. AI generations persist that request ID for admin traceability in `/ops`.

### `GET /api/metrics`

Returns aggregate production metrics for monitoring without exposing patient content. Access is allowed by either:

- clinic admin session cookie
- `Authorization: Bearer <METRICS_BEARER_TOKEN>` when configured

Optional query:

```text
?windowHours=24
```

The window is clamped between 1 and 168 hours. Output includes AI provider mix, fallback/cache rates, average and p95 latency, pending review counts, document failure counts, open/overdue workflow counts, active/locked user counts, and recent audit-event volume.
