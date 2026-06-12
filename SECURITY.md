# Security

## Current Controls

- HTTP-only signed session cookie.
- Password hashing with bcrypt.
- Role-based route checks.
- Zod validation on API input.
- Per-IP and per-email login throttling.
- AI rate limiting.
- Security headers through middleware: CSP, frame denial, content sniffing protection, referrer policy, and permissions policy.
- Audit logs for clinical writes and AI generations.
- Audit logs for successful and failed known-user login attempts.
- External AI disabled by default.
- AI output stored as draft with review status.
- No secrets committed; `.env.example` documents expected variables.

## Healthcare Safety Controls

- UI disclaimer visible in the app shell and dashboard.
- AI prompt templates prohibit final diagnosis language.
- Output parser enforces `AI draft, doctor review required.`
- AI generation metadata includes source context and provider/model.
- AI drafts require explicit review and can be approved or rejected with audit logging.
- External PHI transfer requires explicit `ALLOW_EXTERNAL_AI=true`.

## Recommended Production Hardening

- Add SSO or MFA for clinic users.
- Use managed secret storage.
- Add field-level encryption for highly sensitive records.
- Add object storage virus scanning for document uploads.
- Add full request tracing and security event monitoring.
- Add row-level tenant isolation tests.
- Add backup restore drills.
- Add account lockout and password reset workflows.
- Add formal HIPAA/GDPR/legal review before real clinical use.

## Known Limitations

This project is a portfolio-grade implementation and not certified medical software. It should not be used with real patient data without compliance review, threat modeling, privacy assessment, and operational safeguards.
