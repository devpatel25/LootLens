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

- API docs (Swagger UI): `/api-docs`. The spec is `/openapi.json` (`public/openapi.json`).
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

In `.env.local` set `DB_TARGET=local`, `DEMO_MODE=true`, `AUTH_TRUST_HOST=true`, a `DATABASE_URL` that points at port 5433 (for example `postgresql://postgres:postgres@localhost:5433/lootlens`), an `AUTH_SECRET`, the Google OAuth pair `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, and a `CRON_SECRET`. Set `PROD_DB_HOST` to your production database host so destructive scripts refuse it.

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
| PR preview | Neon branch per preview | `prisma migrate deploy` in the Vercel build | Vercel Preview scope, `DEMO_MODE=true` |
| Production | Neon `main` | `prisma migrate deploy` in the Vercel build | Vercel Production scope, no demo |

Seed, reset, simulate, and test truncation call `assertNonProdDb()` first. It passes only when `DB_TARGET` is `local`, `ci`, or `preview`, and the `DATABASE_URL` host differs from `PROD_DB_HOST`. Production sets `DB_TARGET=production`.

## Deploy

Vercel builds with `npm run vercel-build`: `prisma generate`, then `prisma migrate deploy`, then `next build`. Each pull request gets a preview with its own Neon branch. Production deploys from `main`. Secrets live in Vercel env vars, never in the repo. New variables go into `.env.example` with an empty value.

## Alerts and refresh

Price and stock alerts are the app's stateful core.

- A daily Vercel Cron job (`vercel.json`, 09:00 UTC) calls `GET /api/cron/refresh` with `Authorization: Bearer $CRON_SECRET`. It refreshes every item, evaluates every watch, and marks expired codes dead.
- "Refresh now" on Item Detail calls `POST /api/items/{id}/refresh`. Each item can refresh once every 5 minutes. A refresh inside that window returns 429 with `retryAfterSeconds`.
- Alerts are deduped and fire on crossings. A watch remembers whether its price and stock conditions already hold, so an alert is created only when a condition flips from not met to met. A price that stays below target does not alert again.
- The UI may poll for new alerts. It does not poll on a timer yet.

## Demo data

All prices, stock, and codes in this repo are demo data until a real data source is chosen and integrated. Each listing carries `source: "demo"` or `"live"`, and screens that show demo data say so with a "Demo data" badge. LootLens never scrapes store sites and never takes payment.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright E2E (builds, then runs `next start` on port 3100) |
| `npm run vercel-build` | What Vercel runs: Prisma client, migrate deploy, `next build` |
| `npm run db:up` | Start (or create) the local PostgreSQL container on port 5433 |
| `npm run db:migrate` | `prisma migrate dev` against the dev database. Refuses a production target |
| `npm run db:test:migrate` | Apply migrations to the test database from `.env.test` |
| `npm run db:seed` | Load demo data |
| `npm run db:generate` | Generate the Prisma client |
