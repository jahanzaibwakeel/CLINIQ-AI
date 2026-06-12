# Security

## Current Controls

- HTTP-only signed session cookie.
- Password hashing with bcrypt.
- Role-based route checks.
- Zod validation on API input.
- Per-IP and per-email login throttling.
- Known-user account lockout after repeated failed password attempts.
- AI rate limiting.
- Security headers through middleware: CSP, frame denial, content sniffing protection, referrer policy, and permissions policy.
- Production origin allow-listing for mutating API requests through `NEXT_PUBLIC_APP_URL` or `TRUSTED_ORIGINS`.
- Audit logs for clinical writes and AI generations.
- Audit logs for successful and failed known-user login attempts.
- Clinic-admin audit viewer for recent security and clinical events.
- Clinic-admin Ops dashboard for AI telemetry, fallback visibility, review backlog, and request trace IDs.
- Clinic-admin Staff page for role coverage, active status, lockout state, and last login review.
- Middleware attaches `X-Request-Id` to responses and AI generations for traceability.
- External AI disabled by default.
- AI output stored as draft with review status.
- No secrets committed; `.env.example` documents expected variables.

## Healthcare Safety Controls

- UI disclaimer visible in the app shell and dashboard.
- AI prompt templates prohibit final diagnosis language.
- Output parser enforces `AI draft, doctor review required.`
- AI generation metadata includes source context and provider/model.
- AI generation telemetry includes latency, cache-hit state, token estimate, and request ID.
- AI drafts require explicit review and can be approved or rejected with audit logging.
- Reviewed AI drafts can be edited before approval and applied into records with audit metadata.
- Uploaded documents automatically create AI triage drafts while preserving doctor review before clinical use.
- Document processing failures mark the document as failed and write an audit event.
- External PHI transfer requires explicit `ALLOW_EXTERNAL_AI=true`.

## Recommended Production Hardening

- Add SSO or MFA for clinic users.
- Use managed secret storage.
- Add field-level encryption for highly sensitive records.
- Add object storage virus scanning for document uploads.
- Connect request tracing and security event monitoring to an external APM/SIEM.
- Add row-level tenant isolation tests.
- Add backup restore drills.
- Add account lockout and password reset workflows.
- Add self-service password reset and admin user invitation workflows.
- Add formal HIPAA/GDPR/legal review before real clinical use.

## Known Limitations

This project is a portfolio-grade implementation and not certified medical software. It should not be used with real patient data without compliance review, threat modeling, privacy assessment, and operational safeguards.
