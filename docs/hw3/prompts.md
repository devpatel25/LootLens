# HW3 before/after prompts

Feature under test: Story 3, cross-store price view (issue #9).
Planned harness: Antigravity. **Actual harness: Claude Code, Claude Opus 5.5, high effort, for both runs** (see "Actual run record" below). Same model and settings for both runs.

## Actual run record

Run by Kunal Ghanwat on Oct 30 to 31, 2026, on his machine.

| | Before | After |
|---|---|---|
| Harness and model | Claude Code, Claude Opus 5.5, high effort | same |
| Worktree | `~/lootlens-hw3/before` | `~/lootlens-hw3/after` |
| Output SHA | `b9018ef` | `1852308` |
| Commits | 1, made by the agent itself (`feat: cross-store price comparison page for demo item`) | 3, made by the agent: `test(#9)` failing tests, `feat(#9)`, `test(#9)` assertion tightening |
| Rules evidence | Rules record and transcript, to be sent by Kunal (pending). No Antigravity screenshots exist | same |

Differences from the planned steps below:

- Claude Code was used instead of Antigravity, so there is no Antigravity rules-panel screenshot. Rules state is documented by Kunal's rules record instead.
- The before agent committed its own output, so there is no separate `hw3: before run output` commit.
- The worktrees lived on Kunal's machine, not at the `LootLens-hw3-*` paths listed under Isolation.

## Starting points

| Run | Branch | Starting SHA | Rules |
|---|---|---|---|
| Before | `hw3/before-comparison` | `e96c9a3` (= `hw3-baseline`) | No AGENTS.md. Antigravity workspace and global rules disabled. |
| After | `hw3/after-comparison` | `e8902ae` (= `hw3-baseline` + AGENTS.md cherry-pick) | AGENTS.md in the repo root, loaded. |

The only file difference between the two starting points is `AGENTS.md` (`git diff --stat hw3-baseline hw3/after-comparison`).

## Before prompt (paste exactly, fresh chat)

```
Build a cross-store price comparison for an item using fixtures/comparison.json.
```

## After prompt (paste exactly, fresh chat)

```
Implement Story 3 (cross-store price view, issue #9) from AGENTS.md section 7, using
fixtures/comparison.json as the data source. There is no database or auth yet. Read
AGENTS.md first and follow its rules. Work test-first: commit the failing tests as
`test(#9): ...` before the implementation as `feat(#9): ...`.
```

The richer after prompt is part of the context-engineering intervention (pointing the agent at the rules and the story), not a hidden variable. The scorecard says so.

## Isolation

Each run happens in its own clean git worktree, so nothing untracked from the main checkout (this file, the plan, `.review/`) is visible to the agent:

| Run | Worktree folder |
|---|---|
| Before | `/Users/devpatel/Documents/GitHub/LootLens-hw3-before` |
| After | `/Users/devpatel/Documents/GitHub/LootLens-hw3-after` |

Screenshots are saved to `~/Desktop/hw3-screenshots/` (outside both worktrees) and copied into `docs/hw3/screenshots/` on the docs branch afterwards.

## Run steps (user)

1. Open the before worktree folder in Antigravity. Confirm `ls AGENTS.md docs` fails (neither exists). Open the rules and customization settings and the global rules file, disable any active rules, and screenshot the empty rules panel to `~/Desktop/hw3-screenshots/before-rules-empty.png`.
2. Fresh chat, paste the before prompt, let it finish. Answer follow-up questions with "use your judgement". Commit the output as-is: `git add -A && git commit -m "hw3: before run output"`. Push.
3. Open the after worktree folder in Antigravity. Keep global rules disabled, same as the before run, so AGENTS.md is the only rules source. Screenshot AGENTS.md shown as loaded to `~/Desktop/hw3-screenshots/after-agents-loaded.png`.
4. Fresh chat, paste the after prompt. Let the agent make its own commits. Commit any leftover output as-is. Push.
5. Send back: both output SHAs, the model name and settings, and confirm the two screenshots are in `~/Desktop/hw3-screenshots/`.
