# HW3 reflection outline (Dev writes the reflection)

Outline only. Each bullet names the evidence to cite. Target: 1 to 2 pages, plain wording, no em-dashes.

## 1. Setup (about 1 paragraph)

- What we built for HW3: public Scrum board (5 columns), 19 issues across two sprint milestones, AGENTS.md in the repo root.
- How AGENTS.md was written: from the PRD stories, the Project 1 design, and the Next.js 16 scaffold. Its main rules: logic in `lib/pricing.ts`, server components fetch, `{data}`/`{error}` route shape, demo-data labelling, TDD commit order, folder map.
- Your own words: why a rules file matters for a pair using AI agents (both partners' agents follow one source of truth).

## 2. Experiment design (about 1 paragraph)

- Feature: Story 3, cross-store price view (issue #9), fixture-backed, no DB or auth.
- Same baseline (`hw3-baseline`), branches differ by one commit (AGENTS.md). Clean worktree per run.
- Same model and settings: Claude Opus 5.5, high effort, Claude Code desktop app. Rules record shows nothing else loaded (`evidence/rules-evidence.md`).
- Before prompt: one line. After prompt: names Story 3, the fixture, AGENTS.md, and the TDD commit format. Say plainly that the richer prompt is part of the intervention.
- Deviation to own: planned Antigravity, ran in Claude Code. Give the reason (Kunal's choice) and what replaced the screenshots (rules record plus transcript check).

## 3. Results (the core, about half a page)

- Scores: before 11/20, after 18/20 (`before-after.md` scores table).
- Pick 2 or 3 concrete differences, each with a snippet or screenshot:
  - Placement: before `lib/comparison.ts` with its own types and a 180-line page; after `cheapestListing` in `lib/pricing.ts`, types in `lib/types.ts`, separate components.
  - Story fit: before "Lowest price" card, no table, no badge (`screenshots/before-ui.png`); after table with a text "Cheapest" badge and Used/Resale tags (`screenshots/after-ui.png`).
  - TDD: before one commit; after `16ed480` red, `1fc7f2e` green.
- The honest part: both got the core logic right (fixture edits E1 and E2 passed in both). AGENTS.md changed structure, story fit, and process more than correctness.
- Cost: about 3 min vs about 25 min (16 of those waiting on a permission prompt). Worth a sentence on whether the extra time bought anything.

## 4. What surprised you (short paragraph)

- The before run was a solid feature on its own; it just built a different product than Story 3.
- The after agent edited AGENTS.md itself (added `lib/demoData.ts` to the folder map), which the rules ask for.
- AGENTS.md was attached automatically in the after session, so the rules were in context before the prompt.
- Both runs hit the same Next 16 quirk (`notFound()` keeps HTTP 200), and neither had been told about it.

## 5. What we changed in AGENTS.md (short paragraph)

- Commit `7f27ee2` adds 8 rules from the gaps (`before-after.md`, "Gaps the after run still showed"). Name 2 or 3: loading/error routes and tests, typed stubs for a real red step, the tie rule for Story 3.
- Note the split between rules the agent missed (3) and rules that were simply missing (5).

## 6. Limits (3 to 4 bullets)

- One run per condition; results describe these runs, not the model on average.
- Richer prompt plus rules changed together, so their effects are not separated.
- Different harness than planned; one identical extra app line in both sessions.
- The scorer (Dev's agent) also wrote AGENTS.md, so the criteria favour its conventions. Codex review and fixture edits were the checks against that.

## 7. Next steps for Project 2 (2 to 3 sentences)

- Kunal's issue #9 starts from the after branch.
- Kunal adds a frontend conventions section to AGENTS.md in Sprint 1 (#19).
- Re-run a small before/after on a Sprint 2 feature to see if the refined rules close the gaps.
