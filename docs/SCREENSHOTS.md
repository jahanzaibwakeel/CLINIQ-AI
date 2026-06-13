# Screenshot Instructions

Run the app:

```bash
docker compose up -d postgres valkey
npm run db:migrate
npm run db:seed
npm run dev
```

Capture these portfolio screenshots:

- Login screen with MediPilot branding.
- Doctor dashboard showing safety banner, task queue, risk flags, and AI workload mix.
- Patient detail page with timeline, semantic search, and AI workbench.
- Patient export privacy panel showing export reason and redaction toggle.
- Consultations page with SOAP note generator.
- Documents page with stored-file metadata, parsed report, and document AI parser.
- Inbox page showing generated operational signals.
- Schedule page showing appointment board and workflow actions.
- Staff page showing role/security controls.
- Ops page showing AI telemetry and request traces.
- Settings page showing local-first AI policy.

Use tablet and desktop widths to demonstrate responsive dashboard behavior.

## Playwright Smoke Tests

Run:

```bash
npm run test:e2e
```

The suite logs in with seeded demo users and checks the main dashboard, patients, schedule, inbox, documents, staff, and export privacy flows. Set `PLAYWRIGHT_BASE_URL` to target a deployed environment, or let the config use `NEXT_PUBLIC_APP_URL`/`APP_HOST_PORT`.
