# Production Review

This review summarizes the current hosting posture for MediPilot AI before putting it behind a real clinic or portfolio domain.

## Ready For Portfolio Hosting

- Production Docker image builds successfully with Next.js standalone output.
- Docker Compose includes web, PostgreSQL, Valkey, and optional Ollama services.
- Host and container ports are environment-driven through `APP_HOST_PORT`, `APP_CONTAINER_PORT`, `POSTGRES_HOST_PORT`, and `VALKEY_HOST_PORT`.
- Browser origins are environment-driven through `NEXT_PUBLIC_APP_URL` and `TRUSTED_ORIGINS`.
- PostgreSQL schema is managed with Prisma migrations and seeded demo data.
- Authentication uses signed HTTP-only cookies, bcrypt password hashes, login rate limiting, and account lockout.
- Role checks are implemented for doctor, clinic admin, and assistant workflows.
- AI outputs are stored with provider/model metadata, source context, prompt version, review status, request ID, and audit logs.
- Local no-cost AI behavior is available through Ollama when installed and `local-clinical-rules-v2` when the LLM runtime is unavailable.
- External AI adapters remain disabled unless `ALLOW_EXTERNAL_AI=true` and provider keys are explicitly configured.
- Tests cover unit behavior, validation, frontend smoke rendering, E2E workflows, and database-backed tenant isolation.
- Screenshots and a demo script are included for recruiter review.

## Required Before Real Clinical Use

- Complete legal, privacy, HIPAA/GDPR, and clinical safety review.
- Replace demo users and demo patient data with clinic onboarding flows and real identity policy.
- Add MFA or SSO for clinic accounts.
- Store production secrets in a managed secret store, not plain server files.
- Configure HTTPS with the final domain and set `NEXT_PUBLIC_APP_URL` plus `TRUSTED_ORIGINS`.
- Configure an approved SMTP provider for password resets and staff invites.
- Use encrypted disks and encrypted database backups.
- Schedule restore drills and account-token cleanup.
- Add approved malware scanning/OCR for document uploads before real patient files.
- Connect centralized logging, alerting, and security monitoring.
- Define audit-log retention, backup retention, breach-response, and access-review policies.

## Final Verification Commands

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run test:integration
npm run build
npm run release:check
npm audit --audit-level=moderate
```

For domain deployment, run:

```bash
PRODUCTION_CHECK_URL=https://your-domain.example npm run release:check
```
