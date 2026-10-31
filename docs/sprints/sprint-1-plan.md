# Sprint 1 plan

**Dates:** Oct 31 to Nov 5, 2026 (ends 11:59 PM ET)
**Milestone:** Sprint 1
**Planning session:** Oct 31, Dev Patel and Kunal Ghanwat (both edit this file)
**Standups:** issue #20 (Oct 31, Nov 2, Nov 4)

## Sprint goal

_To fill in together._ Draft: a signed-in user can open the deployed preview, see their wishlist, open an item's cross-store comparison, and browse live codes, all on demo data with CI green on every PR.

## Committed issues

| # | Issue | Owner | Estimate | Depends on |
|---|---|---|---|---|
| 1 | Auth.js Google sign-in, JWT sessions, route protection | Dev | 3 | #2 |
| 2 | Prisma schema, demo seed, DB guard | Dev | 5 | |
| 3 | Domain logic and API routes (items, listings, codes, settings) | Dev | 5 | #2 |
| 4 | CI pipeline | Dev | 3 | |
| 5 | Vercel + Neon environments, previews, security scanning | Dev | 3 | |
| 6 | Spike: real price and code data APIs | Dev | 2 | |
| 7 | App shell, sign-in page, Demo-data banner | Kunal | 3 | #1 (can stub) |
| 8 | Wishlist UI (Story 7) | Kunal | 5 | #3 types |
| 9 | Cross-store comparison table (Story 3) | Kunal | 5 | #3 types |
| 10 | Live codes view (Story 1) | Kunal | 5 | #3 types |

**Totals:** Dev 21, Kunal 18, sprint 39.

## Order of work

_To confirm together._ Draft:
1. Dev: #2, then #4 so CI exists before feature PRs, then #3 types in `lib/types.ts` early so Kunal is unblocked.
2. Kunal: #7 first, then #9 (can start from the HW3 `hw3/after-comparison` branch on fixtures), #8, #10.
3. Dev: #1, #5, #6 alongside.

## Capacity and risks

- Capacity per partner: _to fill in_
- Risk: UI blocked on API. Mitigation: types land first, UI builds on fixtures in the same shape.
- Risk: Google OAuth setup delays. Mitigation: E2E uses a minted session cookie, not the real provider.
- Kunal's AGENTS.md frontend conventions PR is due this sprint (tracked in #19).

## Decisions

_Record decisions made during planning here._
