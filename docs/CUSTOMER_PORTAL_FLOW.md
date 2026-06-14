# Customer Portal Flow

This note documents the patient/customer-facing flow added to MediPilot AI and why it matters for a complete clinical product demo.

## Product Intent

MediPilot AI is primarily a doctor and clinic operations tool, but a real clinic workflow does not end at the staff dashboard. Patients need a safe way to view basic clinic updates and send requests without exposing raw clinical records or unreviewed AI output.

The patient portal adds that customer layer while preserving the app's safety boundary:

- no autonomous diagnosis
- no emergency-care workflow
- no raw notes or full document text
- no unreviewed AI drafts
- limited patient-safe data after MRN/date-of-birth verification

## Patient Journey

1. Patient opens `/portal`.
2. Patient enters MRN and date of birth.
3. The portal verifies the record and displays:
   - upcoming appointments
   - follow-up instructions
   - recent document statuses
   - clinic-reviewed visit summaries
4. Patient submits a request for:
   - appointment scheduling
   - medication question
   - document/report question
   - billing
   - general clinic request
5. The request appears in the internal clinic portal queue.

Demo access:

```text
URL: /portal
MRN: DEMO-1001
DOB: 1982-04-12
```

## Clinic Staff Journey

1. Doctor, clinic admin, or assistant opens `/portal-requests`.
2. Staff review new patient messages.
3. Staff move the request through:
   - `NEW`
   - `IN_REVIEW`
   - `RESOLVED`
   - `CLOSED`
4. Status changes write audit logs under the signed-in staff user.

Portal requests also appear in the main Inbox so staff do not have to check a separate screen.

## Assistant Role Boundary

The assistant role now has a clear reason to exist:

- Assistants coordinate operations.
- Doctors own clinical judgment.
- Clinic admins own staff/security/platform controls.

Assistants can:

- schedule appointments
- upload and track documents
- manage tasks and follow-ups
- triage patient portal requests
- generate operational AI drafts for task extraction and follow-up wording

Assistants cannot:

- review/apply clinical AI drafts
- use clinical risk, referral, SOAP, or patient-context AI modules
- access settings, audit, staff, or ops screens
- export patient charts

## Safety And Privacy Design

The portal intentionally returns limited data:

- patient display identity
- appointment summaries
- follow-up instructions
- document names/statuses
- reviewed visit summaries only

It does not expose:

- raw consultation notes
- full document extraction text
- embeddings
- risk scores
- unreviewed AI drafts
- internal audit events

Public portal writes are rate-limited, validated with Zod, CSRF/origin protected by middleware, and audited with `actorId: null`.

## Why This Improves The Portfolio Project

This moves MediPilot AI from a staff-only dashboard into a fuller clinical workflow platform:

- patient UX exists
- assistant role has meaningful least-privilege scope
- customer requests connect into clinic operations
- audit logging covers both public-origin and staff-origin workflow events
- CI/E2E tests verify the portal flow on desktop and tablet
