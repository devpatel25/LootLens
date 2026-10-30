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

Prisma + PostgreSQL and Auth.js (Google) are added in issues #2 and #1.

## Getting started

Requires Node 24.

```bash
npm install
npx playwright install chromium
cp .env.example .env.local   # fill in values later; nothing is needed for the scaffold
npm run dev                  # http://localhost:3000
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

## Data

All prices, stock, and codes in this repo are demo data until a real data source is chosen and integrated. Demo data is labelled as such in the UI.
