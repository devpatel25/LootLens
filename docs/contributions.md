# Who did what

LootLens is built by two people. This page records who owned which part, which pull requests and reviews each person made, and what is still open for submission (tracking issue #19). Numbers are from GitHub on 2026-11-16; update them before submitting.

## Roles

| | Dev Patel (`devpatel25`) | Kunal Ghanwat (`KunalGhanwat3`) |
|---|---|---|
| Area | Backend: database, API routes, sign-in, CI, deploys, domain logic in `lib/` | Frontend: every screen, components, client state, accessibility, end-to-end tests, release checks |
| Issues owned | #1 to #6, #11 to #14 (10 issues) | #7 to #10, #15 to #19 (9 issues) |

Each user story was split into a backend issue (Dev) and a screen issue (Kunal), so both partners worked on every feature and reviewed each other's pull requests.

## Pull requests

### Dev Patel

| PR | What it adds | Issues |
|---|---|---|
| #22 | Phase 0 plan, review log, Sprint 1 plan, HW3 setup | Phase 0 |
| #23 | HW3 scorecard with rules record and transcripts | HW3 |
| #24 | API contract types and fixtures (folded into #27) | #3 |
| #25 | Prisma schema, demo seed, database guard, CI pipeline | #2, #4 |
| #26 | Google sign-in, JWT sessions, proxy, route helpers | #1 |
| #27 | Items, listings, stores, codes, and settings routes with pricing logic | #3 |
| #28 | Watches, alerts, Refresh now, daily cron, demo simulate | #11 |
| #29 | OpenAPI spec, Swagger page, schema diagram, README | #13, #14 |

### Kunal Ghanwat

| PR | What it adds | Issue |
|---|---|---|
| #30 | App shell, navigation, sign-in page, Demo data badge, shared loading/empty/error states, frontend conventions in AGENTS.md | #7 |
| #31 | Cross-store comparison table on Item Detail | #9 |
| #32 | Wishlist with add, edit, and delete | #8 |
| #33 | Live promo codes with copy, filters, mark dead and alive | #10 |
| #34 | Store trust signs and the cheapest trusted alternative | #17 |
| #35 | Best Deal total, cashback chips, code settings | #16 |
| #36 | Price watches, alerts, unread badge, Refresh now | #15 |
| #42 | Accessibility checks and audit, architecture doc, production smoke test, demo script | #18 |
| #43 | This contribution log and the submission checklist | #19 |

The frontend pull requests are stacked: each one builds on the one before (#30, then #31, #32, #33, #34, #35, #36), on top of Dev's #25 to #29. They merge in that order.

## Reviews

| Reviewer | Pull requests reviewed |
|---|---|
| Kunal Ghanwat | #22 (approved), #23 (approved), #24, #25 (changes requested), #26 (approved), #27, #28, #29 (changes requested) |
| Dev Patel | #30, #31, #32 (inline reviews; fixes pushed and replied to) |

The course asks for at least 5 visible reviews by each partner. Kunal has 8. Dev has 3 so far, with #33 to #36, #42, and #43 still to review.

## AGENTS.md

- Dev wrote the first version: project context, folder map, resource ownership, environments, architecture rules, data honesty, testing, and workflow.
- Kunal added the "Frontend conventions" section in #30 (Sprint 1, as #19 requires) and kept the folder map and conventions current in each frontend PR: blocking segments and session redirects, forms and JavaScript, dialogs, accessibility checks, and the shared `lib/` helpers.

## How the work was checked

- Every PR follows the test-first order in `AGENTS.md`: a `test(#N)` commit with failing tests, then the `feat(#N)` commit that makes them pass.
- Every PR runs lint, type checks, unit and integration tests, and Playwright end-to-end tests in CI. The frontend PRs add automated accessibility checks (WCAG 2.2 A and AA) on every screen.
- AI coding agents were used under the rules in `AGENTS.md`. Each frontend PR was also read by an independent AI reviewer before it was opened, and every PR is reviewed by the partner before merging.

## Submission checklist (#19)

| Item | Status | Who |
|---|---|---|
| Canvas P2 group formed (by Nov 2) | Confirm on Canvas | Both |
| Sprint 1 planning notes, written jointly | `docs/sprints/sprint-1-plan.md` exists; the goal, capacity, and decisions sections still say "to fill in" | Both |
| Sprint 2 planning notes | Not written yet | Both |
| Sprint retros with partner feedback | Not written yet | Both |
| At least 5 visible PR reviews each | Kunal 8; Dev 3 so far | Dev to review #33 to #36, #42, #43 |
| Both partners contributed to AGENTS.md | Done (see above) | |
| Each partner's 300-word reflection | Not submitted yet | Each person |
| `docs/contributions.md` | This file | Kunal |
| Demo video linked | Not recorded yet; plan in `docs/demo-script.md` | Both |
| Production URL linked | Waiting on deploy setup (#5) | Dev |
| HW3 submission (Oct 30) | Done (#22, #23) | |
