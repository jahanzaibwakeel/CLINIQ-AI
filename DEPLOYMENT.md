# Deployment Guide

## Local Development

```bash
cp .env.example .env
npm install
docker compose up -d postgres valkey
npm run db:migrate
npm run db:seed
npm run dev
```

Visit the URL configured by `NEXT_PUBLIC_APP_URL`. Set `APP_HOST_PORT`, `APP_CONTAINER_PORT`, and `PORT` explicitly for each environment; deployment should not depend on hardcoded app ports.

## Environment Variables

Required:

- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `TRUSTED_ORIGINS`
- `APP_BIND_ADDRESS`
- `APP_HOST_PORT`
- `APP_CONTAINER_PORT`

Recommended:

- `DOCUMENT_STORAGE_DIR`
- `DOCUMENT_MAX_UPLOAD_BYTES`
- `VALKEY_URL`
- `POSTGRES_HOST_PORT`
- `VALKEY_HOST_PORT`
- `AI_PROVIDER`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_EMBEDDING_MODEL`
- `OLLAMA_NUM_PREDICT`
- `ALLOW_EXTERNAL_AI`
- `METRICS_BEARER_TOKEN` for uptime or metrics collectors that cannot use a browser admin session
- `SMTP_URL` or `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` for password reset and staff invitation email
- `ACCOUNT_TOKEN_RETENTION_DAYS` for used reset/invite token retention before cleanup

Do not commit `.env`.

Generate strong local secrets with:

```bash
npm run secrets:generate
```

## Database

Development:

```bash
npm run db:migrate
npm run db:seed
```

Production:

```bash
npm run db:deploy
npm run release:check
```

Set `PRODUCTION_CHECK_URL=https://your-domain.example` to make `release:check` also call `/api/health` and `/api/ready`.

## Ollama

Install locally or run via Docker profile:

```bash
docker compose --profile ollama up -d ollama
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

Use `OLLAMA_NUM_PREDICT` to tune local generation length. Smaller values are faster on CPU-only clinic hardware; larger values give longer drafts.

## VPS Docker Compose

1. Provision a VPS with Docker and Docker Compose.
2. Copy the repo and create a production `.env`.
3. Set a strong `SESSION_SECRET` and explicit host ports such as `APP_HOST_PORT`, `POSTGRES_HOST_PORT`, `VALKEY_HOST_PORT`, and `OLLAMA_HOST_PORT`.
4. For local source deploys, run `docker compose up -d postgres valkey`.
5. Run migrations with the app image or local Node.
6. Start `docker compose up -d web`.
7. Place Caddy, Nginx, or a cloud load balancer in front with HTTPS.

For the included Caddy HTTPS profile:

```bash
docker compose -f docker-compose.prod.yml --profile proxy up -d
docker compose -f docker-compose.prod.yml exec -T web npm run db:deploy
docker compose -f docker-compose.prod.yml exec -T web npm run release:check
docker compose -f docker-compose.prod.yml exec -T web npm run ops:monitor
```

Set `DOMAIN`, `PROXY_HTTP_PORT`, and `PROXY_HTTPS_PORT` in the server `.env`. Keep `APP_BIND_ADDRESS=127.0.0.1` when the proxy runs on the same host.

## Automated CI/CD

The GitHub Actions workflow in `.github/workflows/ci.yml` is split into professional release stages. See [docs/CICD_PIPELINE.md](docs/CICD_PIPELINE.md) for the full pipeline map.

It performs:

- dependency install with `npm ci`
- Prisma schema validation
- Prisma client generation
- lint
- type check
- unit/component tests
- migration deployment against isolated CI PostgreSQL
- database-backed tenant isolation tests
- demo seed validation
- Playwright browser smoke tests
- dependency audit report upload
- production build
- Docker image build
- GHCR publish on `main`
- GitHub Actions pipeline summary
- production release check during VPS deploy
- optional VPS deploy over SSH

To enable automatic VPS deploys, set these repository secrets:

- `VPS_HOST`: server hostname or IP
- `VPS_USER`: SSH user
- `VPS_SSH_KEY`: private key with access to the server
- `VPS_APP_DIR`: app directory on the server, for example `/opt/medipilot-ai`

On the server, keep a production `.env` beside `docker-compose.prod.yml`. The deploy job pulls the latest GHCR image, runs Compose, applies migrations, checks `/api/ready`, runs `scripts/production-check.mjs`, and runs the operations monitor inside the web container.

## Health Checks

- `/api/health`: app process is alive
- `/api/ready`: app can reach PostgreSQL and reports cache state as `ok`, `memory`, or `degraded`
- `/api/metrics`: aggregate AI, document, workflow, and security metrics for clinic admins or bearer-token monitors
- `/ops`: admin-only in-app operations dashboard for AI latency, fallback rate, cache hit rate, request IDs, and review backlog
- `/staff`: admin-only role and login-security dashboard for active users, lockouts, and last-login state

`docker-compose.yml` and `docker-compose.prod.yml` both define web container health checks against `/api/health`.
For external monitoring or cron checks, use `npm run ops:monitor`; see [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md).

## Document Storage

Development and single-server deployments use `DOCUMENT_STORAGE_DIR` for local file storage. Keep this directory outside Git, include it in encrypted server backups when clinically appropriate, and place it on encrypted disk for clinic deployments.

The app stores checksum, size, provider, and scan-status metadata on each document row. The built-in scanner is a safety placeholder that blocks suspicious executable extensions; production deployments should add object-storage malware scanning or an approved security gateway. For PDFs/images, connect an approved OCR worker or document gateway, then pass extracted text into the existing document processing job.

## Render/Fly.io/Railway

- Deploy the web app as a Node service.
- Use managed PostgreSQL.
- Use managed Redis-compatible cache.
- Run `npm run db:deploy` during release.
- Use local AI only if the platform allows private networking to an Ollama host.

## Local Clinic Server

Recommended when PHI should remain on premises:

- Small Linux server with encrypted disk.
- PostgreSQL and Valkey on private network.
- Ollama on same host or LAN-only machine.
- Nightly encrypted database backups.
- VPN or HTTPS with clinic-managed identity controls.

## Backup Strategy

- Daily PostgreSQL logical dump.
- Weekly restore test.
- Encrypt backup files.
- Keep separate retention windows for operational and compliance needs.
- Back up `.env` secrets through a password manager, not plain files.

Run an on-demand backup with:

```bash
BACKUP_DIR=/secure/backups npm run db:backup
```

Restore requires an explicit confirmation flag because it can replace live data:

```bash
CONFIRM_RESTORE=true npm run db:restore -- /secure/backups/medipilot-ai-2026-06-13T10-00-00Z.dump
```

Both commands use `DATABASE_URL`, so they work with any configured host and port.

## Security Maintenance Jobs

Clean expired password reset and staff invite tokens with:

```bash
npm run security:cleanup-tokens
```

Run it daily from cron, a VPS scheduler, or a managed job runner. Expired tokens are deleted immediately; used tokens are retained for `ACCOUNT_TOKEN_RETENTION_DAYS` before cleanup.

Generate a dependency audit locally with:

```bash
npm run security:audit
```

The CI pipeline uploads `npm-audit.json` as an artifact so dependency risks can be reviewed without blocking unrelated portfolio/demo work.

## Production Readiness Checklist

- Strong `SESSION_SECRET`.
- HTTPS enabled.
- `APP_BIND_ADDRESS` reviewed so the internal app port is not publicly exposed unless intentionally deployed that way.
- `npm run release:check` passes with `PRODUCTION_CHECK_URL` set to the hosted domain.
- `ALLOW_EXTERNAL_AI=false` unless explicitly approved.
- `/api/health` and `/api/ready` monitored.
- `npm run ops:monitor` passes against the hosted domain.
- Database backups configured and tested.
- Audit log retention policy defined.
- Account-token cleanup scheduled.
- Seed/demo data removed or isolated.
- Rate limits reviewed.
- Role permissions verified.
- Staff accounts reviewed for active status, lockouts, and role coverage.
- Dependency updates monitored.
- Error monitoring added.

## Troubleshooting

- AI badge shows local draft engine: Ollama is missing or unreachable, so MediPilot is using the no-cost deterministic local draft engine. Verify Ollama is running, the model is pulled, and `/api/ai/status` reports `ready` if you want LLM-backed drafts.
- Login fails: run seed and check demo credentials.
- Migrations fail: verify `DATABASE_URL`.
- Semantic search empty: upload/process documents or seed demo data.
- Docker app cannot reach Ollama: use `OLLAMA_BASE_URL=http://ollama:11434` inside Compose.
