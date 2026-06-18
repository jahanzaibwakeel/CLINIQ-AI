# MediPilot AI Demo Script

Use this path for a focused 5-7 minute portfolio walkthrough.

## 1. Login And Safety Boundary

- Open the configured app URL.
- Sign in as `doctor@medipilot.local` with `DemoPassword123!`.
- Point out the visible safety banner: AI drafts are productivity support, not diagnosis, and doctor review is required.

## 2. Doctor Dashboard

- Show the first post-login screen is the real doctor dashboard.
- Highlight workload cards, risk flags, task queue, AI runtime status, and the local-first provider posture.

## 3. Patient Workflow

- Open Patients, then Sara Malik.
- Show clinical timeline, notes, tasks, follow-ups, semantic search, and the embedded AI workbench.
- Generate a patient-friendly summary or SOAP draft from short bullet notes.

## 4. Consultation And AI Drafts

- Open Consultations.
- Generate a SOAP note or visit summary.
- Show the output is rendered as readable clinical sections and marked as an AI draft requiring review.

## 5. Document Intelligence

- Open Documents.
- Upload/paste report text such as: `HbA1c 8.4%, glucose 190 mg/dL, missed eye exam follow-up`.
- Show stored-file metadata, parsed values, AI triage, semantic indexing, and safe fallback behavior when Ollama is unavailable.

## 6. Review, Audit, And Admin Controls

- Open AI Review and show editable JSON plus readable AI sections.
- Open Settings/Ops for readiness, telemetry, and AI provider status.
- Sign in as `admin@medipilot.local` to show Staff role controls, failed-login counters, and account state.

## 7. Patient Portal And Assistant Workflow

- Open `/portal` and show the patient-safe customer view with request history.
- Open `/portal-requests` as the assistant and generate an AI portal reply draft.
- Point out that the draft is internal, patient-safe, marked for review, and must be inserted/edited before sending.

## 8. Deployment Proof

- Mention Docker Compose services: web, PostgreSQL, Valkey, and optional Ollama.
- Mention CI coverage: lint, type check, unit tests, integration tests when services are available, Playwright E2E, build, and release checks.
- Mention domain readiness: `NEXT_PUBLIC_APP_URL`, `TRUSTED_ORIGINS`, `APP_HOST_PORT`, and `APP_CONTAINER_PORT` control browser origins and ports without deployment hardcoding.
