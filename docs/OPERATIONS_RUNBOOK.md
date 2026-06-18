# Operations Runbook

This runbook covers the production-style operating steps for MediPilot AI before and after putting it behind a real domain.

## Monitoring

Use the built-in operations monitor from a cron job, uptime runner, or deployment check:

```bash
MONITOR_BASE_URL="https://your-domain.example" \
METRICS_BEARER_TOKEN="replace-with-monitor-token" \
npm run ops:monitor
```

The script checks:

- `/api/health` for process health
- `/api/ready` for database/cache readiness
- `/api/metrics` when `METRICS_BEARER_TOKEN` is configured

Set `MONITOR_REQUIRE_METRICS=true` when the monitoring job should fail if metrics are not accessible.

Monitor results can be:

- `ok`: health, readiness, and metrics are reachable with no attention status.
- `degraded`: infrastructure is reachable, but metrics are skipped or report operational attention such as pending AI review or overdue work.
- `failed`: a required endpoint is unavailable, readiness failed, or required metrics access is missing.

## Backup Drill

Run an encrypted database backup from the server or trusted admin workstation:

```bash
BACKUP_DIR=/secure/backups npm run db:backup
```

Verify the generated `.sha256` file, then test restore against a separate non-production database:

```bash
CONFIRM_RESTORE=true npm run db:restore -- /secure/backups/medipilot-ai-example.dump
```

Do not restore over production unless the incident commander explicitly approves it.

## Scheduled Maintenance

Recommended production schedule:

- Every 5 minutes: `npm run ops:monitor`
- Nightly: encrypted database backup
- Weekly: restore drill against an isolated database
- Weekly: `npm run security:cleanup-tokens`
- Weekly: dependency/security review from CI artifacts
- Monthly: staff access review and lockout/audit review

## Incident Response

1. Confirm impact through `/api/health`, `/api/ready`, `/api/metrics`, and server logs.
2. Disable external AI by setting `ALLOW_EXTERNAL_AI=false` if PHI handling is in question.
3. Rotate affected secrets in the secret manager and deployment environment.
4. Review audit logs for affected clinic/user/patient scope.
5. Preserve logs and database snapshots before destructive recovery actions.
6. Document timeline, suspected cause, remediation, and follow-up tasks.

## Domain Go-Live Gate

Before final deployment:

- `NEXT_PUBLIC_APP_URL` is the HTTPS domain origin.
- `TRUSTED_ORIGINS` includes the exact HTTPS domain origin.
- `APP_HOST_PORT` and `APP_CONTAINER_PORT` are explicit in server env.
- `APP_BIND_ADDRESS=127.0.0.1` when HTTPS is terminated by the included proxy on the same VPS.
- `SESSION_SECRET`, `POSTGRES_PASSWORD`, SMTP credentials, and monitor token are strong secrets.
- `npm run secrets:generate` has been used instead of example secret values.
- `npm run release:check` passes with `PRODUCTION_CHECK_URL` set.
- `npm run ops:monitor` returns no failed checks against the domain.
- Backups and restore drill are documented.
- Demo seed data is removed or isolated from any real clinic environment.
