# AGENTS.md

Shared rules for every AI agent and both partners working on LootLens. Maintained by Dev Patel (backend, DB, auth, DevOps, `lib/` domain logic) and Kunal Ghanwat (frontend pages, components, client state, UX, a11y, E2E). Change this file through a PR like any other code.

## 1. Project context

LootLens is a personal price and promo-code tracker for students who shop online for clothes, shoes, and small tech. A signed-in shopper saves an item and sees, in one place: live promo codes checked recently, the item's price at several stores with the cheapest marked, cashback, store trust signs, and alerts for price drops and low stock in their size. The shopper then taps through to the store to buy. LootLens never takes payment.

### Stack

Next.js App Router 16, React 19, TypeScript (strict), Tailwind CSS 4, Prisma + PostgreSQL (Neon), Auth.js with Google OAuth and JWT sessions, Vitest (component tests use `@testing-library/react` with `// @vitest-environment jsdom`), Playwright. Hosted on Vercel. Exact versions live in `package.json` and the README table.

Next.js 16 differs from older versions in your training data. Before writing Next-specific code (routing, caching, route handlers, `params`, middleware, config), read the matching guide in `node_modules/next/dist/docs/` and follow it over memory. `cacheComponents` is on, so once a page has started streaming, `notFound()` renders the not-found UI with HTTP 200: tests assert the not-found UI, never the status code.

### Folder map

```
app/                    routes (server components by default)
  (auth)/signin/        sign-in page
  wishlist/             Wishlist home
  items/[id]/           Item Detail: comparison table, Best Deal, codes, watch panel
  codes/  alerts/  settings/
  api/                  route handlers = the public API (items, items/[id]/listings, codes,
                        watches, alerts, stores, settings, health, cron, demo)
components/             UI components (ComparisonTable, CodeCard, WatchPanel, ...)
lib/
  pricing.ts            pure price math: cheapestListing, bestTotal, isFresh, trustFlags
  alerts.ts             pure alert evaluation
  types.ts              shared API response types (the API contract)
  db-guard.ts           assertNonProdDb()
  prisma.ts  auth.ts
prisma/                 schema.prisma, seed.ts
fixtures/               demo JSON in API shapes, for UI work and tests
tests/                  Vitest unit + integration
e2e/                    Playwright
docs/                   architecture, API, schema, sprints, retros, reviews
```

Put new code in this map. If the map has to change, update this section in the same PR.

### Resource ownership

| Resource | Owner | Rule |
|---|---|---|
| Item, Listing (via Item), Watch, Alert, UserSettings | the signed-in user | Every query filters by `userId` from the session. A request for another user's record, or one naming a parent ID the user does not own, returns 404. |
| Store, Code | shared | Any signed-in user can read. Mark dead/alive is open to any signed-in user and records `lastCheckedAt` and `lastCheckedById`. Codes are created and deleted only by seed or ingestion, never by a public endpoint. |
| Demo simulate/reset | dev only | Requires `DEMO_MODE=true` and `assertNonProdDb()`. |
| `/api/cron/refresh` | Vercel Cron | No session. Requires `Authorization: Bearer ${CRON_SECRET}`, else 401. Exempt from auth middleware. |

Take `userId` from `auth()` only. Request bodies, query strings, and route params never supply it.

### Environments

| Env | Database | Migrations | Secrets |
|---|---|---|---|
| Local dev | Neon `dev` branch or local Docker PG | `prisma migrate dev` | `.env.local` (gitignored), `DEMO_MODE=true` |
| CI | Postgres service container | `prisma migrate deploy` before tests | GitHub Actions env, throwaway values, `DEMO_MODE=true` |
| PR preview | Neon branch per preview | `prisma migrate deploy` in Vercel build | Vercel Preview scope, `DEMO_MODE=true` |
| Production | Neon `main` | `prisma migrate deploy` in Vercel build | Vercel Production scope, no demo |

Seed, reset, simulate, and test truncation call `assertNonProdDb()` (`lib/db-guard.ts`) first. It is fail-closed:

- It passes only when `DB_TARGET` is exactly `local`, `ci`, or `preview`, AND the `DATABASE_URL` host differs from `PROD_DB_HOST` when that is set. Unset or any other value throws.
- Production sets `DB_TARGET=production`. `PROD_DB_HOST` is set in Vercel and in each maintainer's `.env.local`.
- `VERCEL_ENV` is an extra check only, never the sole signal.
- Unit tests keep these cases rejected: `DB_TARGET` missing, `DB_TARGET=production`, and a production host with `VERCEL_ENV` unset.

## 2. Architecture rules

- **Domain math lives in `lib/`.** Cheapest listing, best total, freshness, trust flags, and alert evaluation are pure functions in `lib/pricing.ts` and `lib/alerts.ts`. Components and route handlers call them and display the result. A component that computes a price, a discount, or a "cheapest" choice itself is a bug.
- **Server components fetch; client components interact.** Pages and layouts are server components that load data. Add `"use client"` only to the smallest leaf that needs state, effects, or event handlers (sheets, copy button, toggles, mark dead/alive).
- **Route handler shape** for every session-authenticated route (all of `app/api` except `auth`, `health`, and `cron`, which follow the ownership table):
  1. `const session = await auth()`; no session returns 401.
  2. Parse params, query, and body with zod; failure returns 400.
  3. User-owned resources: query scoped to `session.user.id`; not found or not owned returns 404. Shared resources (Store, Code): any signed-in user reads.
  4. Success returns `{ data }`. Errors return `{ error: { code, message } }` with the matching status (400, 401, 404, 409, 429, 500).
- **API contract first.** The backend issue adds the response types to `lib/types.ts` before the matching UI issue starts. UI work builds against `fixtures/` files in exactly those shapes until the route is live, then swaps the fixture for the fetch with no type changes. When a contract type gains a field, update the fixture to the exact shape in the same PR, so UI code never reshapes fixture data.
- **Money:** prices are numbers in USD. Round only for display, with `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`.
- **Naming:** components `PascalCase.tsx`, one component per file; lib modules `camelCase.ts`; tests `*.test.ts(x)` beside the code or in `tests/`; E2E `e2e/*.spec.ts`.

## 3. Data honesty

- Every screen showing seeded, simulated, or fixture data shows the `<DemoDataBadge>` ("Demo data"). Listings carry `source: "live" | "demo"`; label each one.
- Describe prices only with what the data supports: "cheapest of the stores shown", "lowest in the days tracked".
- Banned wording and features (PRD non-goals): "lowest price ever", "all-time low", guaranteed future prices, checkout, auto-applying codes, social feed, Instagram import. Store sites are never scraped.
- The fictional low-trust store and any fictional resale store are labelled fictional wherever they appear.

## 4. Testing (TDD)

- Red, green, refactor. Commit the failing test first as `test(#N): ...`, then the implementation as `feat(#N): ...`. A reviewer should see the red commit in the PR history.
- Make the red step fail on assertions: commit typed stubs (the real exports and signatures, returning placeholders) with the failing tests, so the tests run and fail on behaviour.
- A test change after the `feat` commit goes in its own `test(#N)` commit that says why. It keeps every check the story requires.
- Coverage per feature:
  - `lib/` logic: Vitest unit tests, including edge cases (out of stock in the saved size, ties, min spend not met, first-order-only with the toggle off).
  - Route handlers: integration tests covering 401, 400, cross-user 404 for read and mutate, and the success shape.
  - UI: component tests for all four states (loading, empty, error, populated) and one Playwright flow per user story. Every data route gets a `loading.tsx` and an `error.tsx`.
- Query UI tests by role and accessible name (`getByRole("columnheader", { name: "Price" })`), the same way a user finds things. Use `getByText` only for plain text that has no role, scoped with `within(row)`.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e` all pass before a PR asks for review.

## 5. Scrum workflow

- Every change starts from a GitHub issue on the LootLens Scrum board.
- Branch: `feature/<issue#>-short-desc` (or `fix/`, `chore/`, `docs/`).
- Commits: small, `type(#issue): message`, types `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.
- PR body: what changed, how it was tested, screenshots for UI, and `Closes #N`.
- Merge needs a review from the partner plus green CI. Dev reviews Kunal's UI PRs; Kunal reviews Dev's API PRs.
- Move the issue across the board: Sprint Todo, In Progress (branch pushed), In Review (PR open), Done (merged).

## 6. Do and don't

- Secrets stay in `.env.local`, GitHub Actions secrets, and Vercel env vars. Never commit, print, or paste them in chat or PR comments. New variables go into `.env.example` with an empty value.
- Accessibility basics on every UI change: every input has a label, every icon button has an `aria-label`, focus is visible, colour is never the only signal (a "Cheapest" badge has text), and text meets WCAG AA contrast.
- Use what is already installed before adding a dependency, and say why in the PR when you add one.
- Docs and UI copy use plain wording: short sentences, no em-dashes, no filler.

## 7. User stories (acceptance criteria source)

From the HW2 PRD. Issues and tests trace back to these.

1. **Live codes only.** The Codes view shows only codes with status live AND checked within the freshness window (default 24h; 6/12/24/48/72). Each shows "checked Xh ago" and its terms. Mark dead hides it at once. "Show dead codes" toggle, off by default.
2. **Code plus cashback.** Item Detail Best Deal card: price minus best applicable code minus cashback (applied to the post-code price) equals the total. Codes failing min spend, or first-order-only while the user's first-order toggle is off, are excluded. Every code card shows a cashback chip.
3. **Cross-store price view.** Item Detail lists the item's price at every store in one comparison table. The cheapest listing in stock for the saved size gets a "Cheapest" badge. Used and resale listings count. On a price tie, a listing in new condition wins, then the store name A to Z. Used and resale listings are tagged.
4. **Price drop plus low size alert.** A watch has a target price (or any drop) and a low-stock threshold for the saved size. Alerts fire on crossing, carry an unread badge, and group by item. Deleting the watch stops new alerts.
5. **Low-friction sign-in.** One-click Google sign-in, no password, no marketing email. Wishlist, watches, and alerts belong to the signed-in user.
6. **Trust signs.** Each store row shows HTTPS, photo-review count, and seller name. Low-trust when not HTTPS, under 20 photo reviews, or rating under 3.5 (starting values). When the cheapest store is low-trust, name the cheapest trusted alternative.
7. **Wishlist.** Cards show item, saved size, and cheapest current price and store. Full add, edit, delete; data persists.

## 8. References

- HW2 PRD: interviews P1, P2, P3 and MoSCoW. Must: stories 1, 3, 4. Should: 2, 6, 7.
- Project 1 "Deal Tracker" artifact: the design reference for screens (bottom tab bar on mobile, left sidebar at md and up), data model, and calculations. Not a code base to copy.
- GitHub issues on the LootLens Scrum board: per-issue acceptance criteria and estimates.
