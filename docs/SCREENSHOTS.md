# Screenshots

The current portfolio screenshot set lives in `docs/screenshots`:

- `01-login.png`: branded login and demo credential entry.
- `02-dashboard.png`: doctor dashboard with workload, tasks, AI safety, and runtime posture.
- `03-patients.png`: patient registry.
- `04-patient-detail.png`: patient chart, history, and embedded AI workbench.
- `05-documents.png`: document upload, parsed values, and document AI intelligence.
- `06-ai-review.png`: AI draft review queue.
- `07-settings.png`: production readiness and local-first AI settings.
- `08-tablet-dashboard.png`: tablet dashboard responsiveness.
- `09-patient-portal.png`: patient-safe portal with limited clinical data and request history.
- `10-portal-reply-ai.png`: staff portal queue with AI-assisted patient reply drafting.

## Recapture

Run the app, then use Playwright or browser screenshots to refresh the set:

```bash
docker compose up -d postgres valkey web
PLAYWRIGHT_BASE_URL="${NEXT_PUBLIC_APP_URL}" npm run test:e2e
```

Keep desktop and tablet captures in the set to demonstrate responsive dashboard behavior.

## Playwright Smoke Tests

Run:

```bash
npm run test:e2e
```

The suite logs in with seeded demo users and checks the main dashboard, patients, schedule, inbox, documents, staff, and export privacy flows. Set `PLAYWRIGHT_BASE_URL` to target a deployed environment, or let the config use `NEXT_PUBLIC_APP_URL`/`APP_HOST_PORT`.

For a Docker-hosted local verification run, keep ports environment-driven:

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL="${NEXT_PUBLIC_APP_URL}" npm run test:e2e
RUN_INTEGRATION_TESTS=1 AI_PROVIDER=fallback npm run test:integration
```

The E2E suite runs serially because it exercises real seeded accounts against production-style login throttling. It reuses browser auth state during the run instead of weakening the application rate limiter.
