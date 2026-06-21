# Vercel Recruiter Demo Deploy

This is the fastest free/near-free path for a public recruiter demo. It is not the real clinic production architecture.

## Stack

- Vercel Hobby: Next.js app hosting
- Neon Free: PostgreSQL
- Upstash Redis Free: optional Redis-compatible cache
- AI provider: `fallback` so all AI workflows stay free and demo-safe

## 1. Create Services

1. Create a Neon project and copy the pooled PostgreSQL connection string.
2. Optional: create an Upstash Redis database and copy the TLS `rediss://` URL.
3. Import the GitHub repository into Vercel.

## 2. Set Vercel Environment Variables

Copy `.env.demo.example` into Vercel project settings and replace placeholders:

```text
NEXT_PUBLIC_APP_URL=https://your-vercel-project.vercel.app
TRUSTED_ORIGINS=https://your-vercel-project.vercel.app
DATABASE_URL=postgresql://...
SESSION_SECRET=<generated>
AI_PROVIDER=fallback
ALLOW_EXTERNAL_AI=false
VALKEY_URL=rediss://...
DOCUMENT_STORAGE_DIR=/tmp/uploads
DOCUMENT_MAX_UPLOAD_BYTES=1000000
METRICS_BEARER_TOKEN=<generated>
```

Generate local secret values with:

```bash
npm run secrets:generate
```

Do not paste real secrets into GitHub files.

## 3. Deploy

Trigger the Vercel deployment from the dashboard.

After the first successful build, run migrations and seed data once from a trusted machine:

```bash
DATABASE_URL="postgresql://..." npm run db:deploy
DATABASE_URL="postgresql://..." npm run db:seed
```

The seed creates demo users only. Do not use real patient data in the free demo environment.

## 4. Verify

Open:

```text
https://your-vercel-project.vercel.app/api/health
https://your-vercel-project.vercel.app/api/ready
```

Then run:

```bash
PRODUCTION_CHECK_URL="https://your-vercel-project.vercel.app" \
NEXT_PUBLIC_APP_URL="https://your-vercel-project.vercel.app" \
TRUSTED_ORIGINS="https://your-vercel-project.vercel.app" \
DATABASE_URL="postgresql://..." \
SESSION_SECRET="<generated>" \
AI_PROVIDER=fallback \
ALLOW_EXTERNAL_AI=false \
npm run release:check
```

## Demo Credentials

```text
doctor@clinik.local / DemoPassword123!
admin@clinik.local / DemoPassword123!
assistant@clinik.local / DemoPassword123!
```

## Demo Limitations

- Uploaded file bytes are temporary on Vercel; extracted text, metadata, and AI drafts are stored in Postgres.
- AI uses the safe local fallback instead of paid or external model APIs.
- Background jobs run inline/API-triggered for demo simplicity.
- This setup is for portfolio review, not real clinic PHI.
