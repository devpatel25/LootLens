# LootLens HW3 before/after results (from Kunal)

## Output SHAs (pushed)

| Run | Branch | Output SHA |
|---|---|---|
| Before | `hw3/before-comparison` | `b9018efdaaaafd05c2522703c1650e75d2feb00c` |
| After | `hw3/after-comparison` | `18523089a1360ed9a3a4fb9d888ab536c886748d` |

## Tool, model and settings (same for both runs)

- **Tool: Claude Code (Claude desktop app), not Antigravity.** Kunal chose to run it this way.
- Model: `claude-opus-5-5` (Opus 5.5), effort `high`, permission mode `default`, fast mode off, default output style.
- Each run was a brand-new session opened in its own worktree. Each got its exact prompt from `docs/hw3/prompts.md` (confirmed word for word in each run's log), wrapped by the app in the same two extra lines for both runs:
  - Background: "Work in the current project folder as it is. The user is not available for follow-up questions, so use your judgement on anything unclear."
  - A pointer to a shared side-session notes folder outside the repo, for hand-over notes.
- The after run's first message also had an app status line saying a sibling session named `hw3-before` was working. It never messaged that session or read its notes. The before run got no mention of the after session.
- AGENTS.md loading: the app auto-loaded `~/lootlens-hw3/after/AGENTS.md` as project instructions at the start of the after run (23:40:39). The before run loaded no instruction files at all.
- Global rules: there is no `~/.claude/CLAUDE.md`, no global rules, skills or agents, and no `CLAUDE.md`/`AGENTS.md` in any parent folder. `~/.claude/settings.json` only sets the theme. This was checked before the runs and replaces the two Antigravity screenshots (`before-rules-empty.png`, `after-agents-loaded.png`).
- Both runs started at 23:40 ET on Oct 30 and ran in parallel, in separate worktrees.

## Rules record (answers Dev's question on PR #22)

Checked from the files on disk and from each run's own session log (`~/.claude/projects/-Users-kunal-lootlens-hw3-{before,after}/*.jsonl`).

| Source Claude Code loads automatically | Before run | After run |
|---|---|---|
| `~/.claude/CLAUDE.md` (user rules) | none (file does not exist) | none |
| Parent-folder `CLAUDE.md` / `CLAUDE.local.md` / `AGENTS.md` (`~/lootlens-hw3`, `~`, `/Users`, `/`) | none found | none found |
| Project `CLAUDE.md` / `.claude/` in the worktree | none | none (only the repo's `AGENTS.md`) |
| `~/.claude/rules/`, user skills, user agents | none (folders do not exist) | none |
| Managed (org) settings, `/Library/Application Support/ClaudeCode` | none | none |
| Auto-memory | no `memory/` folder ever created for this project, so nothing loaded or saved | same |
| Hooks | none: `~/.claude/settings.json` only sets `"theme": "dark"`, no `settings.local.json`, no project settings | none |
| Plugins | none installed (no `installed_plugins.json`; only the official marketplace catalog is cached) | none |

Same for both runs: the Claude desktop app's built-in system prompt and its built-in skills list (the default skills that ship with the app) were present in both sessions, identically.

Isolation between runs: the app gives each side session a shared notes folder for its hand-over report. Both runs listed it in their first minute (around 23:40), and it was empty both times. The before run wrote its report there at 23:43 and the after run wrote its own at 23:48, but the after run's log never mentions the before run's report or the `before` folder. Neither run saw the other's output.

## Setup checks (section 4)

All passed. Before was at `e96c9a3` with no AGENTS.md or docs; after was at `e8902ae` with exactly one commit above `hw3-baseline`. Both trees were clean and `npm test` gave 1 passed in each.

## Before run

- Commits (made by the agent itself, so no `hw3: before run output` commit was needed; the tree was clean afterwards):
  - `b9018ef feat: cross-store price comparison page for demo item`
- Files: `app/compare/[itemId]/page.tsx`, `app/page.tsx`, `lib/comparison.ts`, `tests/comparison.test.ts`, `e2e/compare.spec.ts` (+433 lines)
- Self-reported: typecheck, lint, 11 unit tests and 4 e2e tests pass (not re-run by the setup agent).
- Created no AGENTS.md, CLAUDE.md or other rules file.
- Time: about 3 min (23:40:29 to the commit at 23:43:42).

## After run

- Commits, in order (all made by the agent; no leftover commit needed):
  1. `16ed480 test(#9): add failing tests for cross-store price view` (23:45:54)
  2. `1fc7f2e feat(#9): add cross-store comparison table on Item Detail` (00:05:15)
  3. `1852308 test(#9): tighten fictional-store and not-found assertions` (00:05:15)
- Files: `app/items/[id]/page.tsx`, `components/ComparisonTable.tsx`, `components/DemoDataBadge.tsx`, `lib/demoData.ts`, `lib/pricing.ts`, `lib/types.ts`, three Vitest files, `e2e/item-detail.spec.ts`, `package.json` (+3), `package-lock.json` (+1226 / -17 across 13 files)
- Self-reported: lint, typecheck, 26 Vitest tests and 3 Playwright tests pass (not re-run by the setup agent).
- **Unusual: the agent edited AGENTS.md.** In `1fc7f2e` it added one line to the `lib/` layout map: `demoData.ts  fixture loader in API shapes, stand-in until a route is live`. It was committed as-is, per section 8.
- It also added dependencies (`package.json` +3 lines, lockfile updated).
- It paused once for a request that Kunal answered in the app. <!-- Kunal: say what it asked and what you answered -->
- Time: about 25 min (23:40:38 to the last commit at 00:05:15), including that pause.

## Other notes

- Questions asked: the before run asked none. The after run's only pause is noted above.
- No crashes, and neither run stopped early.
- On this machine nvm puts Node 14 first in PATH. Setup used Node 24 (`/usr/local/bin/node`); the experiment sessions got the same shell environment as each other.
- Transcripts were exported from the app as zip files in `~/Downloads`: `session-export-1793419571551.zip` (before) and `session-export-1793419571785.zip` (after).
