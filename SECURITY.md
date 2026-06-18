# Security

## Current Controls

- HTTP-only signed session cookie.
- Password hashing with bcrypt.
- Role-based route checks.
- Assistant role is least-privilege: operational task/follow-up AI only, no clinical AI review, no settings, no staff/security/admin screens, and no patient chart export.
- Zod validation on API input.
- Per-IP and per-email login throttling.
- Known-user account lockout after repeated failed password attempts.
- Password reset and staff invite flows use hashed, single-use, time-limited account tokens.
- Expired account tokens can be cleaned with `npm run security:cleanup-tokens`.
- AI rate limiting.
- Security headers through middleware: CSP, frame denial, content sniffing protection, referrer policy, and permissions policy.
- Production origin allow-listing for mutating API requests through `NEXT_PUBLIC_APP_URL` or `TRUSTED_ORIGINS`.
- Audit logs for clinical writes and AI generations.
- Public patient portal request creation and patient replies are audited with `actorId: null`, then staff replies and status changes are audited under the signed-in user.
- Patient portal magic links use hashed, single-use, time-limited `PatientPortalToken` records and a separate patient session cookie.
- Audit logs for successful and failed known-user login attempts.
- Clinic-admin audit viewer for recent security and clinical events.
- Clinic-admin Ops dashboard for AI telemetry, fallback visibility, review backlog, and request trace IDs.
- Aggregate `/api/metrics` endpoint requires clinic-admin session access or an optional bearer token for trusted monitors.
- `npm run release:check` validates required production env, HTTPS posture, and external AI configuration.
- Clinic-admin Staff page for role coverage, active status, lockout state, and last login review.
- Staff role changes, activation/deactivation, and lockout resets require clinic admin privileges and audit logging.
- Middleware attaches `X-Request-Id` to responses and AI generations for traceability.
- External AI disabled by default.
- Local deterministic AI draft engine is available when Ollama is unavailable, avoiding paid APIs and external PHI transfer for demos.
- AI output stored as draft with review status.
- No secrets committed; `.env.example` documents expected variables.
- Email delivery uses environment-configured SMTP/Nodemailer settings or development log previews.

## Healthcare Safety Controls

- UI disclaimer visible in the app shell and dashboard.
- AI prompt templates prohibit final diagnosis language.
- Output parser enforces `AI draft, doctor review required.`
- AI generation metadata includes source context and provider/model.
- AI generation telemetry includes latency, cache-hit state, token estimate, and request ID.
- AI drafts require explicit review and can be approved or rejected with audit logging.
- Patient portal reply AI drafts are internal-only until staff insert, edit, and manually send them.
- Reviewed AI drafts can be edited before approval and applied into records with audit metadata.
- Uploaded documents automatically create AI triage drafts while preserving doctor review before clinical use.
- Document processing failures mark the document as failed and write an audit event.
- Uploaded document payloads are stored with provider, byte size, checksum, and scan-status metadata.
- Patient chart exports require a stated reason, default to redacted contact details, and write audit metadata.
- Patient portal lookup returns limited patient-safe data after MRN/date-of-birth verification and does not expose raw notes, full documents, or unreviewed AI drafts.
- Patient portal request acknowledgements, staff replies, and status updates use configured SMTP/Nodemailer or the safe development log fallback.
- External PHI transfer requires explicit `ALLOW_EXTERNAL_AI=true`.

## Recommended Production Hardening

- Add SSO or MFA for clinic users.
- Use managed secret storage.
- Run `npm run release:check` during deployment and after secret rotation.
- Run `npm run ops:monitor` from a trusted monitor or cron target after deployment; see [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md).
- Use an approved SMTP provider and rotate SMTP credentials through secret management.
- Rotate `METRICS_BEARER_TOKEN` like an operational secret when bearer-token monitoring is enabled.
- Add field-level encryption for highly sensitive records.
- Replace the local scan placeholder with approved object-storage malware scanning for document uploads.
- Connect request tracing and security event monitoring to an external APM/SIEM.
- Expand tenant isolation coverage from database integration tests to API-level and UI-level cross-clinic access tests.
- Add backup restore drills.
- Schedule `npm run security:cleanup-tokens` in production.
- Add formal HIPAA/GDPR/legal review before real clinical use.

## Known Limitations

This project is a portfolio-grade implementation and not certified medical software. It should not be used with real patient data without compliance review, threat modeling, privacy assessment, and operational safeguards.
