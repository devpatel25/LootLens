# Sprint 2 plan

**Milestone:** Sprint 2
**Planning session:** _date_, Dev Patel and Kunal Ghanwat (both edit this file)
**Standups:** issue #21

## Sprint goal

_To fill in together._ Draft: a shopper can set a watch and get price-drop and low-size alerts, see the real total after codes and cashback, see which stores look trustworthy, and the release is checked (accessibility, smoke test, demo video).

## Committed issues

| # | Issue | Owner | PR |
|---|---|---|---|
| 11 | Watches and alerts API, refresh, cron, alert evaluation | Dev | #28 |
| 12 | Real data source behind an adapter with demo fallback | Dev | cut, and closed as not planned (decision in `docs/data-sources.md` section 8, added in #37) |
| 13 | OpenAPI spec, Swagger page, schema diagram | Dev | #29 |
| 14 | README setup and deployment guide | Dev | #29 |
| 15 | Watch panel, alerts view, unread badge, 60s polling (Story 4) | Kunal | #36 |
| 16 | Best Deal card and settings (Story 2) | Kunal | #35 |
| 17 | Trust badges and cheapest trusted alternative (Story 6) | Kunal | #34 |
| 18 | Release: E2E, accessibility audit, smoke test, architecture, demo video | Kunal | #42 |
| 19 | Submission checklist and contribution log | Kunal | #43 |

## Order of work

_To confirm together._

- Merged into `main`: #24 to #29 and #37 (backend, environments, data sources decision).
- Next, in stack order: #30 (based on `main`), #31, #32, #33, #34, #35, #36, #42, and #43 (frontend, release checks, and this log).
- Dev's follow-ups (#61, #63 to #66) each target `main` on their own, outside the stack.

## Capacity and risks

- Capacity per partner: _to fill in_
- Risk: the frontend PRs are stacked, so a fix low in the stack means rebasing every PR above it. Mitigation: merge them in order, and rebase the rest together with `git rebase --update-refs`.
- Risk: #61 and #35 both change how Best Deal is picked in `lib/pricing.ts` (#35 adds `pickBestDeal`). Whichever merges second needs a careful rebase.
- Resolved: Vercel previews failed until the Preview environment variables were set (#5). They pass now.

## Decisions

_Record decisions made during planning here._
