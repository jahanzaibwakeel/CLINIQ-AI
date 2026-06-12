# Resume Bullets

- Built MediPilot AI, a full-stack clinical workflow assistant for doctors using Next.js, TypeScript, Prisma, PostgreSQL, Valkey, and Docker.
- Designed a free local-first AI architecture with Ollama and `qwen2.5:7b` default inference, prompt versioning, structured JSON validation, semantic search, conservative fallbacks, and gated external provider adapters.
- Modeled realistic healthcare workflows including patients, consultations, notes, documents, chunks, embeddings, AI generations, tasks, follow-ups, RBAC users, and audit logs.
- Implemented AI features for SOAP notes, consultation summaries, history timelines, report parsing, follow-up instructions, task extraction, risk flag explanation, referral letters, visit summaries, and patient-context Q&A.
- Embedded AI directly into dashboard, consultation, patient, document, and task workflows through a reusable clinical AI composer.
- Added automatic AI document triage that parses uploaded reports, explains risk flags, and extracts task candidates immediately after chunking and embedding.
- Built role-specific product surfaces for doctors, clinic admins, and assistants, plus an AI draft review workflow that lets clinicians edit and apply reviewed output to records.
- Added appointment scheduling, a derived notification inbox, and audited patient chart export to broaden the clinical operations surface.
- Built an admin Ops dashboard with request IDs, AI latency, cache/fallback rates, token estimates, document triage volume, readiness checks, and audit signals.
- Added admin staff security visibility with role coverage, last-login state, active status, failed-login counters, and temporary account lockout.
- Added healthcare safety controls including doctor-review disclaimers, AI draft metadata, provider/model traceability, review status, audit logging, and external PHI opt-in controls.
- Delivered deployment readiness with Docker Compose, PostgreSQL/Valkey health checks, GitHub Actions CI, tests, seed data, environment examples, and production security documentation.
