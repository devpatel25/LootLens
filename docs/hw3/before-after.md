# HW3 before/after scorecard

> **Status: provisional.** Kunal's rules record and both transcripts are still pending. Until they confirm no global `CLAUDE.md`, memory, or plugins were active in the before run, treat the conclusions below as provisional.

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
| A1 | One comparison table lists every listing in the fixture (5 rows) | Partial: all 5 listed, as a card list, not a table | Pass: `<table>` with caption, `scope="col"` headers, `scope="row"` store cells, 5 rows |
| A2 | "Cheapest" badge on the cheapest listing in stock for the saved size (size 9: Facebook Marketplace, $60, used) | Partial: correct listing, shown in a separate "Lowest price" card, no badge on the row | Pass: text "Cheapest" badge on the Facebook Marketplace row |
| A3 | Stock filter is real (E1): marker moves to Walmart ($92.50), not Amazon ($84.99) | Pass: "Lowest price $92.50 Walmart" | Pass: "Walmart ... $92.50 Cheapest" |
| A4 | Used and resale listings are tagged | Pass: condition text on every card ("Used", "Resale") | Pass: `USED` / `RESALE` tags |
| A5 | Demo data is labelled on screen | Pass: fixture label shown as `role="note"` banner | Pass: `<DemoDataBadge>` plus a plain-language note; `source: "demo"` on every listing |
| A6 | Vitest unit test covers the cheapest-for-size rule | Pass: "reflects stock for the chosen size", "returns no best price when nothing is in stock" | Pass: "skips a cheaper listing that is out of stock in the size", tie and no-stock cases |
| A7 | Playwright test covers the table and badge | Fail against Story 3: there is no table or badge to test; its E2E covers its own card list (5 items), the "Lowest price" card, size switching, and unknown item | Pass: table and badge flow, unknown item |
| A8 | lint, typecheck, unit, E2E all pass | Pass: 11 unit, 4 E2E | Pass: 26 unit, 3 E2E |
### Evaluation-time fixture edits

The committed fixture alone cannot tell a real stock filter from "cheapest overall", because Facebook Marketplace is cheapest either way. So each run is also checked with these temporary edits to `fixtures/comparison.json`, applied identically to both branches, never committed (`git checkout fixtures/` after each):

| Edit | Change | Expected result |
|---|---|---|
| E1 | `lst-fbm` stock size 9: 1 -> 0 | Badge on Walmart ($92.50). Amazon ($84.99, 0 in size 9) must not get it. |
| E2 | Every listing's size 9 stock -> 0 | No Cheapest badge; an empty or "none in your size" state, no crash |
| E3 | E1, plus `lst-adidas` price -> 92.5 (tie with Walmart) | Recorded, not scored pass/fail (Story 3 does not define ties): exactly one badge or a stated tie rule, no crash |

Results (dev server, rendered HTML, 2026-10-31; fixture restored with `git checkout fixtures/` after each, both trees clean):

| Edit | Before | After |
|---|---|---|
| Baseline | "Lowest price $60.00 Facebook Marketplace" | Badge on Facebook Marketplace $60.00 |
| E1 | "Lowest price $92.50 Walmart" (pass) | Badge on Walmart $92.50 (pass) |
| E2 | No "Lowest price" card, "No store..." message (pass) | No badge, "No store shown has size 9 in stock." (pass) |
| E3 | Adidas wins the tie (sort falls back to store name A-Z, untested) | Adidas wins the tie (new beats used, then input order; stated in a doc comment and tested) |

Each run's own Vitest suite was checked for E1-E3 cases written unprompted: before covers E1 and E2, not ties; after covers all three.

## Scores (1 to 5, with evidence)

| Criterion | Before | After | Evidence |
|---|---|---|---|
| Pattern consistency (server/client split, route and file layout) | 3 | 5 | Both are server-only (no `"use client"`). Before puts the page, four helper components (`ComparisonResults`, `Highlight`, `StoreRow`, `UpdatedAt`), and the size picker in one 180-line file at `/compare/[itemId]`, a route not in the folder map. After uses `app/items/[id]/page.tsx` (the mapped Item Detail route), `components/ComparisonTable.tsx`, `components/DemoDataBadge.tsx`, and adds `lib/demoData.ts` to the AGENTS.md folder map in the same commit, as AGENTS.md section 1 asks. |
| Design intent (Story 3 AC, P1 layout, demo labelling, no banned claims) | 3 | 5 | Before never saw Story 3, so it invented its own product: "Lowest price" and "Lowest new price" cards, savings against the typical price, no table, and no Cheapest badge (the store name links out but is not styled as a link). After meets every AC item and explains the badge with wording AGENTS.md section 3 allows: "Cheapest marks the lowest price among the stores shown with size 9 in stock." Neither uses banned claims. Screenshots: `screenshots/before-ui.png`, `screenshots/after-ui.png`. |
| Naming and architecture (logic in `lib/pricing.ts`, shared types, folder map) | 2 | 4 | Before: pure logic in `lib/comparison.ts` (good, computed in cents) but its own type names inside that file, no `lib/types.ts`, and UI helpers in the page. After: `cheapestListing(listings, size)` in `lib/pricing.ts` (the name AGENTS.md uses), contract types in `lib/types.ts` with a `source: "live" \| "demo"` field, and the component only displays what `cheapestListing` returns. One point off: AGENTS.md says fixtures are in exactly the API shapes, but `fixtures/comparison.json` (fixed in `hw3-baseline`) has no `source` field, so `lib/demoData.ts` transforms it. That is a reasonable fixture-only exception given the fixed baseline, but it is still a seam the UI swap must remove. |
| Test quality (TDD commit order, edge cases, role-based queries) | 3 | 4 | Before: one commit with tests and code together, so no red step; good edge cases (sold out, bad size, unknown store, no float drift); E2E uses `getByRole` only. After: follows the AGENTS.md TDD rule: `test(#9)` commit `16ed480` is red when run on its own (3 test files fail to import the missing modules), then `feat(#9)` `1fc7f2e` turns it green, then a separate `test(#9)` commit `1852308` tightens two tests and says why. 26 unit and component tests, including tie and no-stock cases. One point off: AGENTS.md asks for component tests of loading, empty, error, and populated states; only empty, no-stock, and populated are tested (there is no `loading.tsx` or `error.tsx` for the route). |
| **Total** | **11 / 20** | **18 / 20** | |

## Specific differences

**Where the cheapest rule lives.** Both runs kept the math pure; only the after run put it where the rules say.

Before, `lib/comparison.ts`:

```ts
const available = rows.filter((r) => r.inStock);
return { ..., lowest: available[0] ?? null,
  lowestNew: available.find((r) => r.listing.condition === "new") ?? null };
```

After, `lib/pricing.ts`:

```ts
/**
 * The lowest-priced listing with the size in stock, or null when none has it.
 * Used and resale listings count. On a price tie a new listing wins, then input order.
 */
export function cheapestListing(listings: Listing[], size: string): Listing | null {
```

**How the result is shown.** Before: `<Highlight title="Lowest price" row={lowest} />` in a "Best prices" section above a card list. After: `{isCheapest && (<span ...>Cheapest</span>)}` inside the price cell of a real table row.

**Demo labelling.** Before renders the fixture's own `label` string. After renders the shared `<DemoDataBadge>` and tags every listing `source: "demo"` through `lib/demoData.ts`, ready to swap for `GET /api/items/[id]/listings`.

**TDD.** Before log: `b9018ef feat: cross-store price comparison page for demo item`. After log: `16ed480 test(#9): add failing tests...`, `1fc7f2e feat(#9): add cross-store comparison table...`, `1852308 test(#9): tighten fictional-store and not-found assertions`.

**Dependencies.** After added `@testing-library/react`, `@testing-library/dom`, and `jsdom`, with the reason in the commit message ("AGENTS.md asks for component tests queried by role, and nothing installed could render a component in Vitest"), as AGENTS.md section 6 asks.

**What the rules did not change.** Both runs got the core logic right: in-stock filter, no-stock state, correct prices, no banned claims, demo label present, all checks green. The before run was a solid feature. AGENTS.md mainly changed where code lives, what it is named, how closely it matched the story, and the commit order.

## Gaps the after run still showed

**Against existing AGENTS.md rules (missed):**

1. **Loading and error states.** AGENTS.md section 4 asks for component tests of loading, empty, error, and populated states. The after run built and tested empty, no-stock, and populated only, with no `loading.tsx` or `error.tsx` for `/items/[id]`.
2. **Fixture shape.** AGENTS.md section 2 says fixtures are in exactly the API shapes. The baseline fixture lacks `source`, so the run added a transform in `lib/demoData.ts`. Justified here because the baseline is fixed, but it shows the rule needs a fixture-update step.
3. **Query style.** AGENTS.md section 4 says to query by role and accessible name. The after tests use `getByText` 14 times next to 15 `getByRole`.

**Not covered by AGENTS.md (proposed refinements, not violations):**

4. **Red by missing module.** The failing tests failed because the modules did not exist. AGENTS.md only asks for the failing test first, so this complies. Proposed: create typed stubs first so the red step fails on assertions.
5. **Test edits after green.** `1852308` changed two tests after the implementation in its own explained commit. Allowed today. Proposed: a test change after `feat` gets its own `test(#N)` commit that says why and never weakens what the story requires.
6. **`notFound()` returns 200 under `cacheComponents`.** Both runs hit this and asserted the not-found UI instead of the status. Proposed: state it in AGENTS.md as a Next 16 gotcha.
7. **Ties are undefined in Story 3.** The runs broke ties differently. Proposed: ties go to a new listing, then the lower store name A-Z (product decision to confirm with Kunal).
8. **Test dependencies.** Testing Library and jsdom are now needed for component tests. Proposed: list them in the AGENTS.md stack so later runs do not re-decide.

## Caveats

- Harness was Claude Code (Opus 5.5, high effort), not the planned Antigravity. Claude Code loads `~/.claude/CLAUDE.md`, parent-folder `CLAUDE.md` files, auto-memory, and plugins/hooks on its own; the before run counts as rules-free only if Kunal's rules record shows those were off. Pending.
- Claude Code does not load `AGENTS.md` by itself; the after run read it because the after prompt said to. That is part of the intervention, stated above.
- One run per condition. The scores describe these two runs, not the average behaviour of the model.
