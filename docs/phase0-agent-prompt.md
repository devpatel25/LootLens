## Appendix: kickoff prompt for the implementing agent

```
You are implementing Phase 0 of LootLens in /Users/devpatel/Documents/GitHub/LootLens.

Read these first, fully, before doing anything:
1. docs/phase0-plan.md  (the plan; it is your source of truth)
2. /Users/devpatel/Downloads/lootlens-claude-code-handoff.md  (background)

Rules:
- Follow the plan's "Execution order, evidence, and stop points" table row by row
  (rows 0, 1, 2, 3, 4, 5, 6, 7a, 7b, 8). Do one row at a time. Record BASE=$(git rev-parse HEAD)
  at the start of each row.
- After EVERY row from 1 to 8, run the "Codex review gate" recipe exactly as written in the plan
  (codex exec -m gpt-6-astra -s read-only), with that row's evidence from the table.
  A row is done only on VERDICT: GREEN. Fix all high/med findings and re-review,
  max 3 rounds, then stop and show me the open findings.
  Log every round in docs/reviews/codex-log.md.
- Stop and ask me at every "Stop for user" point. Never ask me to paste a secret in chat.
- Phase 0 only. Do not start Sprint 1 issue work (that includes CI and Muse setup).
  Kunal's board access is deferred until he accepts the invite and blocks nothing.
- After each row, report in 3-5 lines: what changed, Codex verdict + rounds, next row.

Start with row 0: check `gh auth status` for the `project` scope and tell me if I need to run
`gh auth refresh -s project`.
```
