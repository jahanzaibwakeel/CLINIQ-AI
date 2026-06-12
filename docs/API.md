# API Documentation

All API routes return JSON. Protected endpoints require the `medipilot_session` cookie created by `/api/auth/login`.

## Auth

### `POST /api/auth/login`

Body:

```json
{ "email": "doctor@medipilot.local", "password": "DemoPassword123!" }
```

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

Creates an extracted-text document record, chunks it, embeds chunks, and marks processing complete.

## Tasks

### `GET /api/tasks`

Lists clinic task queue.

### `POST /api/tasks`

Creates a manual task.

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

### `PATCH /api/ai/generations/:id/review`

Allowed roles: doctor, clinic admin.

Marks an AI draft as reviewed or rejected and writes an audit log.

```json
{ "reviewStatus": "REVIEWED", "reviewerNote": "Optional audit note" }
```

### `POST /api/search`

Runs semantic search against embeddings.

```json
{ "query": "microalbuminuria follow up", "patientId": "optional" }
```

## Operations

### `GET /api/health`

Returns process-level health for load balancers and container health checks.

### `GET /api/ready`

Checks readiness by validating database connectivity. Returns `503` when the app is not ready.
