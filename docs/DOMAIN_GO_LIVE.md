# Domain Go-Live Guide

Use this guide when moving MediPilot AI from portfolio/demo mode to a real hosted domain.

## 1. Prepare The Server

- Provision a Linux VPS or clinic server with Docker and Docker Compose.
- Point the domain DNS `A`/`AAAA` record to the server.
- Open only the HTTPS proxy ports from the internet.
- Keep the app port bound to `127.0.0.1` unless a private load balancer requires otherwise.
- Store the production `.env` on the server only; do not commit it.

## 2. Generate Secrets

Run locally or on the server:

```bash
npm run secrets:generate
```

Copy the generated values into the server-side `.env`:

- `SESSION_SECRET`
- `POSTGRES_PASSWORD`
- `METRICS_BEARER_TOKEN`

Use a password manager or managed secret store for long-term retention.

## 3. Configure Environment

Start from `.env.production.example`, then replace every placeholder:

```bash
APP_BIND_ADDRESS=127.0.0.1
APP_HOST_PORT=<internal-host-port>
APP_CONTAINER_PORT=<container-port>
NEXT_PUBLIC_APP_URL=https://your-domain.example
TRUSTED_ORIGINS=https://your-domain.example
DOMAIN=your-domain.example
PROXY_HTTP_PORT=80
PROXY_HTTPS_PORT=443
ALLOW_EXTERNAL_AI=false
```

Ports are intentionally environment-driven. The Compose files should not be edited just to change ports.

## 4. Start With HTTPS Proxy

```bash
docker compose -f docker-compose.prod.yml --profile proxy up -d
docker compose -f docker-compose.prod.yml exec -T web npm run db:deploy
docker compose -f docker-compose.prod.yml exec -T web npm run release:check
docker compose -f docker-compose.prod.yml exec -T web npm run ops:monitor
```

The optional Caddy profile uses `deploy/Caddyfile` and automatically requests TLS certificates for `DOMAIN`.

## 5. Verify

Run from a trusted workstation:

```bash
PRODUCTION_CHECK_URL=https://your-domain.example npm run release:check
MONITOR_BASE_URL=https://your-domain.example npm run ops:monitor
```

Open the domain and verify:

- login works for seeded or provisioned staff users
- `/api/health` returns 200
- `/api/ready` reports `ready`
- `/api/metrics` works with the monitor bearer token
- password reset and staff invite emails are delivered through SMTP
- AI badge shows local-first or explicitly approved provider behavior

## 6. Backups And Rollback

Before first real use:

```bash
BACKUP_DIR=/secure/backups npm run db:backup
CONFIRM_RESTORE=true npm run db:restore -- /secure/backups/<backup-file>.dump
```

For rollback:

- keep the previous GHCR image tag
- run `docker compose -f docker-compose.prod.yml pull`
- set `MEDIPILOT_IMAGE` to the previous tag
- run `docker compose -f docker-compose.prod.yml up -d`
- restore a backup only when data rollback is explicitly approved

## 7. Go-Live Safety Gate

Do not use real patient data until:

- legal/privacy review is complete
- demo seed data is removed or isolated
- staff accounts and roles are reviewed
- SMTP is configured
- backups and restore drill have passed
- `npm run release:check` passes against the hosted domain
- `npm run ops:monitor` reports no failed checks
- clinic leadership understands that AI output is draft-only and requires clinician review
