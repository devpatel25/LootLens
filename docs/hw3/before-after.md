# HW3 before/after scorecard

Feature: Story 3, cross-store price view (issue #9). Prompts and run steps: [prompts.md](prompts.md).

## Setup

| | Before | After |
|---|---|---|
| Branch | `hw3/before-comparison` | `hw3/after-comparison` |
| Starting SHA | `e96c9a3` | `e8902ae` |
| Output SHA | `b9018ef` | `1852308` |
| Harness, model, settings | Claude Code, Claude Opus 5.5, high effort | same |
| Rules active | none (evidence: Kunal's rules record, pending) | AGENTS.md (evidence: rules record and transcript, pending) |
| Worktree | `~/lootlens-hw3/before` (Kunal's machine) | `~/lootlens-hw3/after` (Kunal's machine) |
| Prompt | brief (1 line) | references Story 3, the fixture, and AGENTS.md |

The runs used Claude Code instead of the planned Antigravity; see the actual run record in [prompts.md](prompts.md).

The after prompt is richer on purpose. Pointing the agent at the rules and the story is part of the context-engineering intervention, not a hidden variable.

## Acceptance checks (same for both runs)

Story 3 AC, checked by reading the code and running each branch's tests (`npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`).

| # | Check | Before | After |
|---|---|---|---|
| A1 | One comparison table lists every listing in the fixture (5 rows) | | |
| A2 | "Cheapest" badge on the cheapest listing in stock for the saved size (size 9: Facebook Marketplace, $60, used) | | |
| A3 | Stock filter is real (eval-only fixture edit E1 below): badge moves to Walmart ($92.50), not Amazon ($84.99, out of stock in size 9) | | |
| A4 | Used and resale listings are tagged | | |
| A5 | Demo data is labelled on screen | | |
| A6 | Vitest unit test covers the cheapest-for-size rule | | |
| A7 | Playwright test covers the table and badge | | |
| A8 | lint, typecheck, unit, E2E all pass | | |

### Evaluation-time fixture edits

The committed fixture alone cannot tell a real stock filter from "cheapest overall", because Facebook Marketplace is cheapest either way. So each run is also checked with these temporary edits to `fixtures/comparison.json`, applied identically to both branches, never committed (`git checkout fixtures/` after each):

| Edit | Change | Expected result |
|---|---|---|
| E1 | `lst-fbm` stock size 9: 1 -> 0 | Badge on Walmart ($92.50). Amazon ($84.99, 0 in size 9) must not get it. |
| E2 | Every listing's size 9 stock -> 0 | No Cheapest badge; an empty or "none in your size" state, no crash |
| E3 | E1, plus `lst-adidas` price -> 92.5 (tie with Walmart) | Recorded, not scored pass/fail (Story 3 does not define ties): exactly one badge or a stated tie rule, no crash |

Each run's own Vitest suite is also checked for whether it covers E1-E3 cases unprompted (feeds the Test quality score).

## Scores (1 to 5, with evidence)

| Criterion | Before | After | Evidence |
|---|---|---|---|
| Pattern consistency (server/client split, route and file layout) | | | |
| Design intent (Story 3 AC, P1 layout, demo labelling, no banned claims) | | | |
| Naming and architecture (logic in `lib/pricing.ts`, shared types, folder map) | | | |
| Test quality (TDD commit order, edge cases, role-based queries) | | | |

## Specific differences

_Code snippets and screenshots for each criterion go here._

## Gaps the after run still showed

_Each gap becomes an AGENTS.md rule in the refinement commit._
