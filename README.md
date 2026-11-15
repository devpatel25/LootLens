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

Auth.js (Google) is added in issue #1.

## Getting started

Requires Node 24.

```bash
npm install
npx playwright install chromium
cp .env.example .env.local   # fill in values later; nothing is needed for the scaffold
npm run dev                  # http://localhost:3000
```

### Local database

Tests use the `lootlens-pg` Docker container on port 5433 through `.env.test`. Run this once:

```bash
npm run db:up && npm run db:test:migrate
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright E2E (builds, then runs `next start` on port 3100) |
| `npm run db:up` | Start (or create) the local PostgreSQL container on port 5433 |
| `npm run db:migrate` | `prisma migrate dev` against the dev database. Refuses a production target |
| `npm run db:test:migrate` | Apply migrations to the test database from `.env.test` |
| `npm run db:seed` | Load demo data |
| `npm run db:generate` | Generate the Prisma client |

## Data

All prices, stock, and codes in this repo are demo data until a real data source is chosen and integrated. Demo data is labelled as such in the UI.
