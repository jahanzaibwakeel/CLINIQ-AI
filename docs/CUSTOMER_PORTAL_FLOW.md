# Customer Portal Flow

This note documents the patient/customer-facing flow added to CLINIK AI and why it matters for a complete clinical product demo.

## Product Intent

CLINIK AI is primarily a doctor and clinic operations tool, but a real clinic workflow does not end at the staff dashboard. Patients need a safe way to view basic clinic updates and send requests without exposing raw clinical records or unreviewed AI output.

The patient portal adds that customer layer while preserving the app's safety boundary:

- no autonomous diagnosis
- no emergency-care workflow
- no raw notes or full document text
- no unreviewed AI drafts
- limited patient-safe data after MRN/date-of-birth verification

## Patient Journey

1. Patient opens `/portal`.
2. Patient can either use the demo MRN/date-of-birth shortcut or request a secure email magic link.
3. The magic link is hashed in the database, expires quickly, is single-use, and creates a short-lived patient portal session.
4. The portal displays:
   - upcoming appointments
   - follow-up instructions
   - recent document statuses
   - clinic-reviewed visit summaries
   - request history and staff replies
5. Patient submits a request for:
   - appointment scheduling
   - medication question
   - document/report question
   - billing
   - general clinic request
6. The request appears in the internal clinic portal queue.
7. Clinic staff can reply directly from the portal request queue.
8. The patient can continue the thread from a secure magic-link session.
9. The patient receives email acknowledgements and staff-reply notifications when an email is on file.

Demo access:

```text
URL: /portal
MRN: DEMO-1001
DOB: 1982-04-12
```

## Clinic Staff Journey

1. Doctor, clinic admin, or assistant opens `/portal-requests`.
2. Staff review new patient messages.
3. Staff can use AI reply assist to draft patient-safe operational wording.
4. Staff review, edit, and manually send patient-visible operational updates.
5. Staff move the request through:
   - `NEW`
   - `IN_REVIEW`
   - `RESOLVED`
   - `CLOSED`
6. AI drafts, replies, and status changes write audit logs under the signed-in staff user.
7. Staff replies and status changes send patient email updates through SMTP or the safe development log fallback.

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
- generate operational AI drafts for task extraction, follow-up wording, and patient portal replies

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
- portal request history and replies for that verified patient

It does not expose:

- raw consultation notes
- full document extraction text
- embeddings
- risk scores
- unreviewed AI drafts
- internal audit events

Public portal writes are rate-limited, validated with Zod, CSRF/origin protected by middleware, and audited with `actorId: null`.
Magic-link access uses hashed single-use `PatientPortalToken` records and a separate `clinik_patient_portal` session cookie, not the internal staff session.
Patients can view request history after MRN/date-of-birth verification, but replies require the stronger magic-link session so an MRN/DOB demo lookup cannot impersonate an ongoing secure conversation.
AI reply assist runs only inside the staff portal queue, stores the draft as an internal `AiGeneration`, and never sends a patient message automatically.

## Why This Improves The Portfolio Project

This moves CLINIK AI from a staff-only dashboard into a fuller clinical workflow platform:

- patient UX exists
- assistant role has meaningful least-privilege scope
- customer requests connect into clinic operations
- audit logging covers both public-origin and staff-origin workflow events
- CI/E2E tests verify the portal flow on desktop and tablet
