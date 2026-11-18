# LootLens

LootLens is a personal price and promo-code tracker for students and young shoppers who buy clothes, shoes, and small tech online.

Project 2 for AI Coding (CS6983), Northeastern, Fall 2026.

## Stack

Versions as scaffolded (see `package.json`):

| Package | Version |
|---|---|
| Next.js (App Router) | 16.4.3 |
| React / React DOM | 19.3.0 |
| Tailwind CSS | 4.3.3 |
| TypeScript | 5.9.3 |
| Vitest | 5.0.5 |
| Playwright | 1.64.1 |
| Prisma | 7.10.1 |
| @prisma/client | 7.10.1 |
| @prisma/adapter-pg | 7.10.1 |
| tsx | 4.23.15 |
| PostgreSQL | 17 |

Auth.js (Google sign-in, JWT sessions) handles auth.

## Links

- API docs (Swagger UI): `/api-docs`. Swagger UI 5.35.0 is vendored in `public/swagger-ui`, so the page loads nothing from a CDN. The spec is `/openapi.json` (`public/openapi.json`).
- Database schema: [`docs/schema.md`](docs/schema.md)
- Scrum board: https://github.com/users/devpatel25/projects/1
- Production URL: TBD after deploy setup (#5)

## Getting started

Requires Node 24 and Docker.

```bash
npm ci
npx playwright install chromium
npm run db:up                  # PostgreSQL 17 on port 5433
cp .env.example .env.local     # then fill in the values below
npm run db:migrate
npm run db:seed
npm run dev                    # http://localhost:3000
```

In `.env.local` set `DB_TARGET=local`, `DEMO_MODE=true`, `AUTH_TRUST_HOST=true`, a `DATABASE_URL` that points at port 5433 (for example `postgresql://postgres:postgres@localhost:5433/lootlens`), an `AUTH_SECRET` (make one with `npx auth secret` or `openssl rand -base64 32`), the Google OAuth pair `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, and a `CRON_SECRET`. In the Google Cloud console, register `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI for that OAuth client. `DATABASE_URL_UNPOOLED` is optional and falls back to `DATABASE_URL`. Set `PROD_DB_HOST` to your production database host so destructive scripts refuse it.

### Tests

Tests use the same container in a separate `lootlens_test` database, through `.env.test`, so test resets never touch your dev data. `db:test:migrate` creates `lootlens_test` if it is missing. Test helpers refuse any database whose name does not end in `_test`.

```bash
npm run db:test:migrate        # once, and after new migrations
npm test                       # Vitest unit and integration
npm run test:e2e               # Playwright, builds and serves on port 3100
```

## Environments

| Env | Database | Migrations | Secrets |
|---|---|---|---|
| Local dev | Neon `dev` branch or local Docker PostgreSQL | `prisma migrate dev` | `.env.local`, `DEMO_MODE=true` |
| CI | PostgreSQL service container | `prisma migrate deploy` before tests | GitHub Actions env, throwaway values, `DEMO_MODE=true` |
| PR preview | Neon `preview` branch, shared by all previews | `prisma migrate deploy` in the Vercel build | Vercel Preview scope, `DEMO_MODE=true` |
| Production | Neon `main` | `prisma migrate deploy` in the Vercel build | Vercel Production scope, no demo |

Seed, reset, simulate, and test truncation call `assertNonProdDb()` first. It passes only when `DB_TARGET` is `local`, `ci`, or `preview`, and the `DATABASE_URL` host differs from `PROD_DB_HOST`. `PROD_DB_HOST` must be set unless the `DATABASE_URL` host is loopback (`localhost`, `127.0.0.1`, `::1`); if it is missing for any other host, the guard throws. Production sets `DB_TARGET=production`.

The guard is also fail-closed on Prisma CLI commands. Only `generate`, `version`, `validate`, `format`, `migrate deploy`, `migrate status`, `migrate diff`, and `db seed` run without it (the seed calls the guard itself). Every other command, such as `migrate dev` or `migrate reset`, runs the guard first and stops when it throws.

## Deploy

What exists today:

- `vercel.json` registers the daily cron for `/api/cron/refresh`.
- `npm run vercel-build` runs `prisma generate`, then `prisma migrate deploy`, then `next build`.

Vercel builds with `vercel-build` and runs `prisma migrate deploy` first. Production deploys from `main` and uses the Neon `main` branch. Every pull request preview uses one shared Neon `preview` branch (the free plan allows 10 branches per project, too few for one per PR). Secrets live in Vercel env vars, never in the repo. New variables go into `.env.example` with an empty value.

## Alerts and refresh

Price and stock alerts are the app's stateful core.

- A daily Vercel Cron job (`vercel.json`, 09:00 UTC, daily only because Vercel Hobby allows nothing more often) calls `GET /api/cron/refresh` with `Authorization: Bearer $CRON_SECRET`. It refreshes every item, evaluates every watch, and marks expired codes dead. Outside demo mode, prices and stock stay as they are until a real data source lands, so the job then only expires codes and re-checks watches.
- "Refresh now" is `POST /api/items/{id}/refresh`. Each item can refresh once every 5 minutes. A refresh inside that window returns 429 with `retryAfterSeconds`.
- Alerts are deduped and fire on crossings. A watch remembers whether its price and stock conditions already hold, so an alert is created only when a condition flips from not met to met. A price that stays below target does not alert again.
- The UI may poll for new alerts. Nothing polls on a timer yet. The Item Detail button and the alerts screens belong to the frontend issues.

## Demo data

All prices, stock, and codes in this repo are demo data until a real data source is chosen and integrated. The API labels every listing `source: "demo"` or `"live"`. The UI (the frontend issues) will show a "Demo data" badge on screens that use demo data. LootLens never scrapes store sites and never takes payment.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright E2E (builds, then runs `next start` on port 3100) |
| `npm run vercel-build` | What Vercel runs: Prisma client, migrate deploy, `next build` |
| `npm run db:up` | Start (or create) the local PostgreSQL container on port 5433 |
| `npm run db:migrate` | `prisma migrate dev` against the dev database. Refuses a production target |
| `npm run db:test:migrate` | Apply migrations to the test database from `.env.test` |
| `npm run db:seed` | Load demo data |
| `npm run db:generate` | Generate the Prisma client |
