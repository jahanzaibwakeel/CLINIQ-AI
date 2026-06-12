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

## Patients

### `GET /api/patients`

Lists clinic patients.

### `POST /api/patients`

Allowed roles: doctor, clinic admin.

Creates a patient record.

### `GET /api/patients/:id`

Returns patient detail, consultations, notes, documents, tasks, follow-ups, and recent AI generations.

### `GET /api/patients/:id/export`

Exports a clinic-scoped patient chart JSON bundle and writes a `PATIENT_CHART_EXPORTED` audit event.

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

Creates an extracted-text document record, chunks it, embeds chunks, marks processing complete, and creates AI triage drafts for:

- document parsing
- risk flag explanation
- task extraction

All generated triage outputs remain AI drafts until reviewed.

If processing fails, the document status is set to `FAILED` and a `DOCUMENT_PROCESSING_FAILED` audit event is created.

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

## AI

### `POST /api/ai/generate`

Runs an AI drafting module and stores an `AiGeneration` row.

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

### `PATCH /api/ai/generations/:id/review`

Allowed roles: doctor, clinic admin.

Marks an AI draft as reviewed or rejected and writes an audit log.

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
