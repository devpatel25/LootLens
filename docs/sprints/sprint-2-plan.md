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
| 12 | Real data source behind an adapter with demo fallback | Dev | cut for this sprint (see `docs/data-sources.md` on the deploy spike branch) |
| 13 | OpenAPI spec, Swagger page, schema diagram | Dev | #29 |
| 14 | README setup and deployment guide | Dev | #29 |
| 15 | Watch panel, alerts view, unread badge, 60s polling (Story 4) | Kunal | #36 |
| 16 | Best Deal card and settings (Story 2) | Kunal | #35 |
| 17 | Trust badges and cheapest trusted alternative (Story 6) | Kunal | #34 |
| 18 | Release: E2E, accessibility audit, smoke test, architecture, demo video | Kunal | release PR |
| 19 | Submission checklist and contribution log | Kunal | this PR |

## Order of work

_To confirm together._ Merge order: #25, #26, #27, #28, #29 (backend), then #30 to #36 (frontend, stacked), then the release PR.

## Capacity and risks

- Capacity per partner: _to fill in_
- Risk: the stacked frontend PRs wait on the backend PRs. Mitigation: review and merge #25 to #29 first.
- Risk: Vercel previews fail until the Preview environment variables are set (#5).

## Decisions

_Record decisions made during planning here._
