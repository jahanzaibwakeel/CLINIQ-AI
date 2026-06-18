# CI/CD Pipeline

MediPilot AI uses GitHub Actions as a production-style delivery pipeline. The workflow is intentionally split into clear stages so failures are easy to understand during recruiter review, pull requests, or production release.

Workflow file:

```text
.github/workflows/ci.yml
```

## Pipeline Stages

### Quality Gate

Runs on every pull request, push to `main`, and manual dispatch.

Checks:

- dependency install with `npm ci`
- Prisma schema validation
- Prisma client generation
- ESLint
- TypeScript type check
- unit and component tests
- production configuration check
- dependency audit artifact
- Next.js production build

Artifacts:

- `quality-reports`

### Database Integration

Runs after the quality gate using isolated PostgreSQL and Valkey service containers.

Checks:

- deploy Prisma migrations
- run tenant-isolation integration tests with `RUN_INTEGRATION_TESTS=1`

The job uses GitHub Actions dynamic service ports instead of assuming host ports.

### Browser Smoke

Runs after the quality gate using isolated PostgreSQL and Valkey service containers.

Checks:

- deploy migrations
- seed demo data
- install Playwright Chromium
- run desktop E2E smoke tests

Covered flows include:

- login
- dashboard navigation
- patient chart export privacy
- AI draft readability
- document intelligence
- staff security controls
- patient portal lookup and request submission

Artifacts:

- `playwright-report`
- `test-results`

### Docker Image

Runs after quality, integration, and browser smoke pass.

Checks:

- Docker Buildx setup
- GHCR image metadata
- production Docker image build
- GHCR push on non-PR runs

Tags:

- branch/ref tag
- pull request tag
- SHA tag
- `latest` on the default branch

### Optional VPS Deploy

Runs on `main` pushes or manual dispatch when deployment is enabled and secrets are configured.

Required secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_DIR`

Deploy actions:

- login to GHCR
- pull latest image
- start `docker-compose.prod.yml`
- run Prisma migrations
- verify `/api/ready`
- run production check script
- run `npm run ops:monitor` when a deployed monitor URL is configured

### Pipeline Summary

Always runs and writes a clear GitHub Actions summary table with stage results and the image target.

## Manual Deployment Trigger

Use GitHub Actions `workflow_dispatch` and set:

```text
deploy=true
```

This keeps deployment controlled while allowing automatic checks and image publishing to run on normal pushes.

## Production Notes

- External AI remains disabled by default.
- Real domain hosting must set `NEXT_PUBLIC_APP_URL` and `TRUSTED_ORIGINS`.
- Browser smoke tests resolve a free local app port at runtime and export `PLAYWRIGHT_BASE_URL`, `NEXT_PUBLIC_APP_URL`, and `TRUSTED_ORIGINS` for that job instead of relying on a committed app port.
- Runtime ports stay environment-driven across Docker, Playwright, and production verification.
- Production secrets must live in GitHub repository secrets or server-side secret management.
- `.env` files must not be committed.
- Use the final domain with HTTPS before enabling real clinic usage.
