# Who did what

LootLens is built by two people. This page records who owned which part, which pull requests and reviews each person made, and what is still open for submission (tracking issue #19). Numbers are from GitHub on 2026-11-18; update them before submitting.

## Roles

| | Dev Patel (`devpatel25`) | Kunal Ghanwat (`KunalGhanwat3`) |
|---|---|---|
| Area | Backend: database, API routes, sign-in, CI, deploys, domain logic in `lib/` | Frontend: every screen, components, client state, accessibility, end-to-end tests, release checks |
| Issues owned | #1 to #6, #11 to #14 (10 issues) | #7 to #10, #15 to #19 (9 issues) |

Reviews also turned up follow-up issues: #44 to #50 and #62. Dev's open PRs #61 and #63 to #66 cover #50, #62, #46, #49, and #44.

Each user story was split into a backend issue (Dev) and a screen issue (Kunal), so both partners worked on every feature and reviewed each other's pull requests.

## Pull requests

### Dev Patel

| PR | What it adds | Issues | State |
|---|---|---|---|
| #22 | Phase 0 plan, review log, Sprint 1 plan, HW3 setup | Phase 0 | merged |
| #23 | HW3 scorecard with rules record and transcripts | HW3 | merged |
| #24 | API contract types and fixtures | #3 | merged |
| #25 | Prisma schema, demo seed, database guard, CI pipeline | #2, #4 | merged |
| #26 | Google sign-in, JWT sessions, proxy, route helpers | #1 | merged |
| #27 | Items, listings, stores, codes, and settings routes with pricing logic | #3 | merged |
| #28 | Watches, alerts, Refresh now, daily cron, demo simulate | #11 | merged |
| #29 | OpenAPI spec, Swagger page, schema diagram, README | #13, #14 | merged |
| #37 | Vercel and Neon environments, CodeQL and Dependabot, data sources decision | #5, #6 | merged |
| #60 | Contract checks: fixture lists match the API types | #3 | merged |
| #61 | Best Deal picks the code that gives the lowest shown total | #50 | open |
| #63 | CodeQL updates grouped, breaking major bumps held | #62 | open |
| #64 | At most 100 saved items per user | #46 | open |
| #65 | Swagger UI served from the app, tighter `/api-docs` CSP | #49 | open |
| #66 | One shared error helper for the proxy and routes | #44 | open |

Issue #12 (a real data source) was closed as not planned: the #6 spike in #37 found that store terms ban price tracking or limit how long data can be kept, so every store uses demo data.

### Kunal Ghanwat

| PR | What it adds | Issue | State |
|---|---|---|---|
| #30 | App shell, navigation, sign-in page, Demo data badge, shared loading/empty/error states, frontend conventions in AGENTS.md | #7 | open |
| #31 | Cross-store comparison table on Item Detail | #9 | open |
| #32 | Wishlist with add, edit, and delete | #8 | open |
| #33 | Live promo codes with copy, filters, mark dead and alive | #10 | open |
| #34 | Store trust signs and the cheapest trusted alternative | #17 | open |
| #35 | Best Deal total, cashback chips, code settings | #16 | open |
| #36 | Price watches, alerts, unread badge, Refresh now | #15 | open |
| #42 | Accessibility checks and audit, architecture doc, production smoke test, demo script | #18 | open |
| #43 | This contribution log and the submission checklist | #19 | open |

The frontend pull requests are stacked: each one builds on the one before. #30 is based on `main`, which already has Dev's backend (#24 to #29 and #37). Then come #31, #32, #33, #34, #35, #36, #42, and #43. They merge in that order.

## Reviews

| Reviewer | Pull requests reviewed |
|---|---|
| Kunal Ghanwat | #22 (approved), #23 (approved), #24 (comments), #25 (changes requested, then approved), #26 (approved), #27 (approved), #28 (approved), #29 (changes requested, then approved), #37 (approved) |
| Dev Patel | #30, #31, #32, #33, #34, #35, #36, #42, #43 (inline comments, then changes requested; fixes pushed and replied to) |

The course asks for at least 5 visible reviews by each partner. Kunal has reviewed 9 pull requests and Dev has reviewed 9, so both have met it. Dev's newer PRs (#61, #63 to #66) are still waiting for Kunal's review.

## AGENTS.md

- Dev wrote the first version: project context, folder map, resource ownership, environments, architecture rules, data honesty, testing, and workflow.
- Kunal added the "Frontend conventions" section in #30 (Sprint 1, as #19 requires) and kept the folder map and conventions current in each frontend PR: blocking segments and session redirects, forms and JavaScript, dialogs, accessibility checks, and the shared `lib/` helpers.

## How the work was checked

- Code PRs follow the test-first order in `AGENTS.md`: a `test(#N)` commit with failing tests, then the `feat(#N)` or `fix(#N)` commit that makes them pass. Docs-only PRs (#22, #23, #29, #43) have no failing test to start from.
- CI arrived with #25. Since then, every PR runs lint, type checks, unit and integration tests, and Playwright end-to-end tests in CI, and #37 added CodeQL security scanning. #22 and #23 merged before CI existed. The frontend PRs add automated accessibility checks (WCAG 2.2 A and AA) on every screen.
- AI coding agents were used under the rules in `AGENTS.md`. Each frontend PR was also read by an independent AI reviewer before it was opened. Partner review comes before merging; the exceptions so far are #60 and the Dependabot updates, which merged without one.

## Submission checklist (#19)

| Item | Status | Who |
|---|---|---|
| Canvas P2 group formed (by Nov 2) | Confirm on Canvas | Both |
| Sprint 1 planning notes, written jointly | `docs/sprints/sprint-1-plan.md` exists; the goal, capacity, and decisions sections still say "to fill in" | Both |
| Sprint 2 planning notes | `docs/sprints/sprint-2-plan.md` exists as a template; the goal, capacity, and decisions sections still say "to fill in" | Both |
| Sprint retros with partner feedback | `docs/retros/sprint-1-retro.md` and `docs/retros/sprint-2-retro.md` exist as templates; both partners still fill them in | Both |
| At least 5 visible PR reviews each | Done: Kunal 9, Dev 9 | |
| Both partners contributed to AGENTS.md | Done (see above) | |
| Each partner's 300-word reflection | Not submitted yet | Each person |
| `docs/contributions.md` | This file | Kunal |
| Demo video linked | Not recorded yet; plan in `docs/demo-script.md` | Both |
| Production URL linked | Live at https://loot-lens-eight.vercel.app (`/api/health` answered 200 on 2026-11-18). Add the link to Canvas | Both |
| HW3 submission (Oct 30) | Done (#22, #23) | |
