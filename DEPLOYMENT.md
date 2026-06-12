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

Visit the URL configured by `NEXT_PUBLIC_APP_URL`. The default template uses port `3000`; set `APP_HOST_PORT`, `APP_CONTAINER_PORT`, and `PORT` when another port is needed.

## Environment Variables

Required:

- `DATABASE_URL`
- `SESSION_SECRET`

Recommended:

- `APP_HOST_PORT`
- `APP_CONTAINER_PORT`
- `VALKEY_URL`
- `POSTGRES_HOST_PORT`
- `VALKEY_HOST_PORT`
- `AI_PROVIDER`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_EMBEDDING_MODEL`
- `ALLOW_EXTERNAL_AI`

Do not commit `.env`.

## Database

Development:

```bash
npm run db:migrate
npm run db:seed
```

Production:

```bash
npm run db:deploy
```

## Ollama

Install locally or run via Docker profile:

```bash
docker compose --profile ollama up -d ollama
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

## VPS Docker Compose

1. Provision a VPS with Docker and Docker Compose.
2. Copy the repo and create a production `.env`.
3. Set a strong `SESSION_SECRET` and explicit host ports such as `APP_HOST_PORT`, `POSTGRES_HOST_PORT`, `VALKEY_HOST_PORT`, and `OLLAMA_HOST_PORT`.
4. For local source deploys, run `docker compose up -d postgres valkey`.
5. Run migrations with the app image or local Node.
6. Start `docker compose up -d web`.
7. Place Caddy, Nginx, or a cloud load balancer in front with HTTPS.

## Automated CI/CD

The GitHub Actions workflow in `.github/workflows/ci.yml` performs:

- dependency install with `npm ci`
- Prisma client generation
- migration deployment against CI PostgreSQL
- demo seed validation
- lint
- type check
- unit/component tests
- production build
- Docker image build
- GHCR publish on `main`
- optional VPS deploy over SSH

To enable automatic VPS deploys, set these repository secrets:

- `VPS_HOST`: server hostname or IP
- `VPS_USER`: SSH user
- `VPS_SSH_KEY`: private key with access to the server
- `VPS_APP_DIR`: app directory on the server, for example `/opt/medipilot-ai`

On the server, keep a production `.env` beside `docker-compose.prod.yml`. The deploy job pulls the latest GHCR image, runs Compose, applies migrations, and checks `/api/ready`.

## Health Checks

- `/api/health`: app process is alive
- `/api/ready`: app can reach PostgreSQL

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

## Production Readiness Checklist

- Strong `SESSION_SECRET`.
- HTTPS enabled.
- `ALLOW_EXTERNAL_AI=false` unless explicitly approved.
- `/api/health` and `/api/ready` monitored.
- Database backups configured and tested.
- Audit log retention policy defined.
- Seed/demo data removed or isolated.
- Rate limits reviewed.
- Role permissions verified.
- Dependency updates monitored.
- Error monitoring added.

## Troubleshooting

- AI returns fallback: verify Ollama is running and model is pulled.
- Login fails: run seed and check demo credentials.
- Migrations fail: verify `DATABASE_URL`.
- Semantic search empty: upload/process documents or seed demo data.
- Docker app cannot reach Ollama: use `OLLAMA_BASE_URL=http://ollama:11434` inside Compose.
