# Codex review log

Every unit of Phase 0 work (one row of the execution table in `docs/phase0-plan.md`) is reviewed by Codex (`codex exec -m gpt-6-astra -s read-only`) before it counts as done. A unit is done only on `VERDICT: GREEN`. Max 3 rounds per unit.

| Date | Row | Round | Base SHA | Verdict | Findings | Resolution |
|---|---|---|---|---|---|---|
| 2026-10-30 | 1 (scaffold, fixture, `hw3-baseline` tag) | 1 | 184234c | GREEN | none | Pushed `main` (9a880cb, e96c9a3) and tag `hw3-baseline` after GREEN |
| 2026-10-30 | 2 (AGENTS.md draft) | 1 | e96c9a3 | CHANGES REQUESTED | [med] DB guard config and rejection tests missing; [low] route template conflicted with cron and shared resources | Both fixed in draft |
| 2026-10-30 | 2 (AGENTS.md draft) | 2 | e96c9a3 | GREEN | [low] `DEMO_MODE=true` missing from local and CI rows | Fixed (cheap) |
| 2026-10-30 | 3 (labels, milestones) | 1 | ebee0c2 | CHANGES REQUESTED | [med] milestone `due_on` differs from plan timestamps | GitHub stores dates only; set due dates to each sprint's last day (Nov 5, Nov 12), exact cutoff kept in descriptions |
| 2026-10-30 | 3 (labels, milestones) | 2 | ebee0c2 | GREEN | none | |
| 2026-10-30 | 4 (project board create, link, public, Status, Estimate) | 1 | ebee0c2 | GREEN | none | Waiting on user: Board layout + signed-out check |
| 2026-10-30 | 4 (user stop) | n/a | ebee0c2 | confirmed | User switched to Board layout and opened the board signed out | Screenshot `docs/hw3/screenshots/board-signed-out.png`; API `layout: BOARD_LAYOUT` |
| 2026-10-30 | 5 (19 issues, board population) | 1 | ebee0c2 | CHANGES REQUESTED | [med] script reset board Status on re-run; [med] issue-number check ran after create | Status/Estimate set only when empty; preflight number check before create; post-run cross-reference validation |
| 2026-10-30 | 5 (19 issues, board population) | 2 | ebee0c2 | GREEN | none | Re-run was a no-op (idempotency proof) |
| 2026-10-30 | 6 (standup issues #20 #21, sprint-1 plan skeleton) | 1 | ebee0c2 | GREEN | none | |
| 2026-10-30 | 7a (HW3 branches, prompts, scorecard template) | 1 | ebee0c2 | CHANGES REQUESTED | [med] untracked docs and screenshots carry across branch switches; [med] A2/A3 cannot detect a broken stock filter | Docs committed on `docs/phase0-records`; each run in its own clean worktree, screenshots outside; eval-only fixture edits E1-E3 added |
| 2026-10-30 | 7a (HW3 branches, prompts, scorecard template) | 2 | ebee0c2 | GREEN | none | Waiting on user: Antigravity runs |
| 2026-10-31 | 7b (scorecard) | 1 | 716ce36 | CHANGES REQUESTED | [med] rules isolation unverified, prompts.md and scorecard disagreed; [med] A7 wrongly passed Before; [med] after-run gaps omitted (loading/error tests, fixture transform); [low] proposed refinements scored as violations | prompts.md reconciled, scorecard marked provisional; A7 Before = fail; gaps recorded, after total 19 -> 18; refinements separated from violations |
| 2026-10-31 | 7b (scorecard) | 2 | 716ce36 | CHANGES REQUESTED | [med] rules record and transcripts still not attached | Blocked on Kunal (requested on PR #22). Stopped before round 3 per the 3-round rule; shown to user |
| 2026-10-31 | 7b (scorecard) | n/a | 716ce36 | partner evidence | Kunal posted the rules record on PR #22 | Added to scorecard; transcripts still pending, round 3 held until they arrive |
