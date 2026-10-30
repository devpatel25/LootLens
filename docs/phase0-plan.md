# LootLens Phase 0 plan: repo setup, Scrum board, milestones, issues, HW3

## Context
LootLens rebuilds the Project 1 "Deal Tracker" artifact as a full-stack app for CS6983 Project 2 (200 pts, pair, due Thu Nov 12 11:59 PM PT = 2026-11-13T07:59Z).
Phase 0 also covers the HW3 deliverables (due Fri Oct 30 11:59 PM PT = 2026-10-31T06:59Z, which is TODAY): AGENTS.md, a GitHub Scrum board, at least 10 issues, one before/after test, and a 1-2 page reflection.
Sources read: the handoff doc, the HW2 PRD PDF, and the Project 1 submission PDF.

Repo: `github.com/devpatel25/LootLens` (public), `main`, one commit (README + .gitignore). The local folder name has uppercase letters.
Partner: Kunal Ghanwat (`KunalGhanwat3`). He has been invited but hasn't accepted yet.

### Decisions locked by the user (Oct 30)
- Stack: Next.js App Router + TS + Tailwind, Prisma + PostgreSQL, Auth.js (JWT sessions), Vitest, Playwright.
- Hosting: Vercel + Neon. OAuth: Google only.
- **Everything is behind auth.** Story 5 is rewritten for P2: "one-click Google sign-in, no password, no marketing email". It is not dropped.
- Sprint 1: Oct 31 to Nov 5. Sprint 2: Nov 6 to Nov 12.
- HW3 before/after feature: cross-store price view (Story 3).
- Data: the user wants a REAL price/code source. A spike (#6) picks the API. Until then, seed data is used and labelled "Demo data". No scraping.
- Muse reviewer: set up after CI exists. The token is entered securely by the user.
- Canvas P2 group is informal for now. Forming it is tracked in #19.
- **Work split by expertise:**
  - Dev owns database, backend, API, auth, DevOps, and the pure domain logic in `lib/`.
  - Kunal owns frontend: pages, components, client state, UX, a11y, and E2E flows.
  - Each Story is split into an API/logic issue (Dev) and a UI issue (Kunal), so both contribute to every feature and review each other's PRs.

### Details from the source PDFs that the handoff missed
- Story 2: first-order-only codes are excluded from the best total **while the per-user "first order" toggle is off**.
- PRD risks: code freshness cadence, store coverage, alert noise (cap watches per user), and code terms shown next to each code.
- Out of scope: checkout, auto-apply, social feed, Instagram import, student-discount hub, and "lowest price ever" claims.
- The P1 PDF holds an artifact share token. It must never go into the repo or docs.

### Resource ownership (applies to all issues)
- **User-owned:** Item, Listing (via its Item), Watch, Alert, UserSettings (`freshnessHours`, `firstOrderEligible`). Every read and write derives `userId` from the session. Any request that references a parent ID belonging to someone else gets a 404.
- **Shared:** Store, Code. Any signed-in user can read them. Mark dead/alive is allowed for any signed-in user and records `lastCheckedAt` plus `lastCheckedById` for audit. Create and delete of codes happen only through seed or ingestion, with no public endpoint.
- **Demo simulate/reset:** these require `DEMO_MODE=true` AND `assertNonProdDb()` (below). `DEMO_MODE` is set in local dev, CI, and previews, and never in production.
- **Cron:** `/api/cron/refresh` uses no user session. It requires `Authorization: Bearer ${CRON_SECRET}` and returns 401 if the header is missing or wrong. Middleware exempts it.

### Environments
| Env | Database | Migrations | Secrets |
|---|---|---|---|
| Local dev | Neon `dev` branch (or local Docker PG) | `prisma migrate dev` | `.env.local` (gitignored) |
| CI | Postgres service container in GitHub Actions | `prisma migrate deploy` before tests | GitHub Actions env, throwaway values |
| PR preview | Neon branch per preview (Neon-Vercel integration) | `prisma migrate deploy` in Vercel build | Vercel Preview scope, `DEMO_MODE=true` |
| Production | Neon `main` branch | `prisma migrate deploy` in Vercel build | Vercel Production scope, no demo |

**Destructive-DB guard (fail closed):** `lib/db-guard.ts` provides `assertNonProdDb()`. Seed, reset, simulate, and test truncation all call it first. It passes only if both of these hold:
- `DB_TARGET` is explicitly one of `local | ci | preview`. Unset or any other value means reject. Production sets `DB_TARGET=production`.
- The `DATABASE_URL` host does not equal `PROD_DB_HOST`, when that is set. `PROD_DB_HOST` is set in Vercel and in maintainers' `.env.local`.

`VERCEL_ENV` is an extra check, not the only one. A unit test covers rejection when `VERCEL_ENV` is unset with a prod host or a missing `DB_TARGET`.

## Today's critical path (HW3 due 2026-10-31T06:59Z)
Today's work needs no Google credentials, no database, and no partner acceptance. Kunal's invite pending blocks nothing. His issues are labelled `owner:kunal` and assigned once he accepts.
1. Scaffold + shared fixture, tagged `hw3-baseline` → 2. AGENTS.md (one commit on top of the baseline) → 3-6. Labels, milestones, board, issues → 8. HW3 before/after on fixtures → scorecard and AGENTS.md refinement → user writes the reflection and submits. Leave at least 2 hours of buffer for the reflection.

Dev runs the HW3 experiment today because Kunal isn't on the repo yet. The UI it produces counts only as experiment output. Kunal's #9 builds the real comparison UI, and he may start from the "after" branch.

User prerequisite before step 5: run `gh auth refresh -s project`, because the token lacks the `project` scope.

## Steps

### 1. Minimal scaffold (one direct push to main, commit message says "initial scaffold")
- `create-next-app` refuses uppercase dir names and non-empty dirs. To work around that, scaffold in the scratchpad: `npx create-next-app@latest lootlens --ts --tailwind --eslint --app --import-alias "@/*" --use-npm`.
- Copy everything except `.git` into the repo, then merge `.gitignore` and the README by hand.
- Add `vitest` and `@vitejs/plugin-react` with a `vitest.config.ts`, plus one passing smoke test.
- Add `@playwright/test` with a `playwright.config.ts` and one smoke test that loads `/`.
- Scripts: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test`, `test:e2e`.
- `app/api/health/route.ts` returns `{status:"ok"}`.
- `.env.example` lists `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_APP_URL`, `DEMO_MODE`, `DB_TARGET`, `PROD_DB_HOST`, and `CRON_SECRET` with empty values.
- README records the exact Next/React/Tailwind versions from package.json.
- Prisma and Auth.js are NOT included today. They belong to issues #1 and #2.
- Commit `fixtures/comparison.json` as a second commit: 1 item, 5 listings covering new/used/resale, and stock per size, labelled demo.
- Tag that commit `hw3-baseline`. The tag stays fixed, and AGENTS.md is NOT in it.
- Check: `npm run dev`, `lint`, `typecheck`, `test`, and `test:e2e` all pass.

### 2. AGENTS.md (root)
Sections:
- Project context: stack and versions, folder map (handoff Section 8), and the resource-ownership and environment tables above.
- Architecture rules:
  - Pure math lives in `lib/pricing.ts` and `lib/alerts.ts`, and the UI never re-implements it.
  - Server components fetch data; `"use client"` is only for interaction.
  - Route handler shape: `auth()`, then zod parse, then `{data}` or `{error:{code,message}}` with the right status.
- API contract first: the backend issue publishes typed response shapes (shared TS types in `lib/types.ts`) before the matching UI issue starts. The UI can build against fixtures in the same shape while the API is in progress.
- Data honesty: the "Demo data" label is required; banned claims are listed.
- TDD: the failing test is committed first (`test(#N): ...`), then the implementation (`feat(#N): ...`). Each feature gets unit tests for its logic, integration tests for its routes, and E2E coverage for its flow.
- Scrum workflow:
  - Branch `feature/<issue#>-short-desc`; commits `type(#issue): msg`; PR body has `Closes #N`.
  - Merge needs a partner review plus green CI.
  - Every PR runs `npm run test` and `npm run test:e2e`.
- Do's and don'ts: no secrets in the repo or chat, no checkout or auto-apply, a11y basics (labels, focus, contrast), plain wording with no em-dashes.
- References: PRD and P1 summaries, with no share tokens.
- Maintained by both partners. Kunal makes at least one substantive AGENTS.md PR in Sprint 1 (frontend conventions section), tracked in #19.

### 3. Labels
Create these with `gh label create`: `feature`, `bug`, `chore`, `docs`, `spike`, `priority:high`, `priority:medium`, `priority:low`, `owner:dev`, `owner:kunal`, `area:backend`, `area:frontend`.

### 4. Milestones (create, not list)
```
gh api --method POST repos/devpatel25/LootLens/milestones -f title='Sprint 1' -f due_on='2026-11-06T04:59:00Z' -f description='Foundation + Musts (Oct 31 - Nov 5, ends 11:59 PM ET)'
gh api --method POST repos/devpatel25/LootLens/milestones -f title='Sprint 2' -f due_on='2026-11-13T04:59:00Z' -f description='Shoulds + finishing (Nov 6 - Nov 12, ends 11:59 PM ET; course cutoff is 11:59 PM PT)'
```

### 5. Project board
1. `gh project create --owner devpatel25 --title "LootLens Scrum" --format json` and capture `number` and `id`.
2. `gh project link <number> --owner devpatel25 --repo devpatel25/LootLens`.
3. `gh project edit <number> --owner devpatel25 --visibility PUBLIC`.
4. Fetch the Status field ID (`gh project field-list <number> --owner devpatel25 --format json`). Then use GraphQL `updateProjectV2Field` with `singleSelectOptions` containing `{name,color,description}` for Backlog (GRAY), Sprint Todo (BLUE), In Progress (YELLOW), In Review (PURPLE), and Done (GREEN). Re-fetch to get the new option IDs.
5. `gh project field-create <number> --owner devpatel25 --name Estimate --data-type NUMBER`.
6. For each issue:
   - `gh project item-add <number> --owner devpatel25 --url <issue-url> --format json` and capture the item ID.
   - Set Status: `gh project item-edit --id <item> --project-id <pid> --field-id <statusId> --single-select-option-id <opt>`.
   - Set Estimate: `gh project item-edit ... --field-id <estId> --number <n>`.
   - Sprint 1 issues get Sprint Todo, Sprint 2 issues get Backlog.
7. Manual UI steps (the API can't do these):
   - Switch the default view to Board layout, grouped by Status.
   - Add Kunal as a Project Admin/Write collaborator once he accepts the repo invite.
8. Verify: `gh project item-list` shows Status and Estimate for every item, the board URL opens in a signed-out browser, and Kunal confirms access from his account.

### 6. Issues (19)
Each issue gets an action title, a user story, an AC checklist, labels (type, priority, `owner:`, `area:`), an Estimate, and a milestone. Feature ACs always include "tests added, failing test committed first". Backend issues need unit + integration tests; UI issues need component tests + E2E.

**Sprint 1 (10): Dev = backend/DB/DevOps, Kunal = UI**

1. **Add Auth.js Google sign-in with JWT sessions and route protection.** Dev, est 3, backend.
   - Depends on #2 for the adapter models.
   - Add `app/api/auth/[...nextauth]/route.ts` (GET/POST) and `auth.ts` with the Google provider, `PrismaAdapter`, and `session.strategy:"jwt"`.
   - The jwt and session callbacks put the DB `user.id` in the token and session, typed via module augmentation.
   - Protect the app with middleware, excluding `/api/auth/*`, `/signin`, `/api/health`, and `/api/cron/*`.
   - Story 5 (P2): Google only, no password field, no email sending.
   - Verify on a preview: first sign-in creates User and Account rows, a returning sign-in reuses the same `user.id`, and anonymous users get redirected.
   - **E2E auth without Google:** Playwright `globalSetup` seeds a test user in the CI DB (guarded), mints a session cookie with `encode()` from `next-auth/jwt` using the CI `AUTH_SECRET`, and saves `storageState`. No test-only provider ships in app code.
2. **Define Prisma schema, demo seed, and DB guard.** Dev, est 5, backend.
   - Pin Prisma versions, then follow the matching setup. If Prisma 7: `prisma.config.ts`, the `@prisma/adapter-pg` driver adapter, explicit generator output, and env loading.
   - Models from handoff Section 9 plus UserSettings, the Section 9 indexes, and `lastCheckedById` on Code.
   - Includes the full [Auth.js Prisma adapter schema](https://authjs.dev/getting-started/adapters/prisma): User gets `emailVerified`, plus the Account, Session, and VerificationToken models.
   - Watch gets transition-state fields `priceCondMet` and `stockCondMet` (bool), used for alert dedupe in #11.
   - `lib/db-guard.ts` with its unit tests.
   - Scripts: `db:generate`, `db:migrate`, `db:seed`. The seed includes the fictional low-trust store, labelled as fictional, and refuses to run on production.
   - `npm run build` passes without DB credentials.
3. **Build domain logic and API routes for items, listings, codes, and settings.** Dev, est 5, backend.
   - `lib/pricing.ts` pure functions, TDD: `cheapestListing(size)`, `isFresh(code, hours)`, `bestTotal` (respects minSpend and the firstOrderOnly toggle; cashback is applied on the post-code price), and `trustFlags` (P1 thresholds: HTTPS, at least 20 photo reviews, rating of 3.5 or higher, documented as starting values).
   - `lib/types.ts`: shared response types for the UI.
   - Routes from handoff Section 10 for items, listings (with cheapest and best total computed), codes (`showDead`, mark dead/alive), stores, and settings.
   - Integration tests cover cross-user read AND mutate attempts on items, nested listings, and settings, plus foreign parent IDs. All of them return 404.
4. **Add CI pipeline.** Dev, est 3, backend.
   - Stages: install, lint, typecheck, then a Postgres service container with `prisma migrate deploy` and seed, then Vitest unit + integration, then build, then the **full Playwright feature suite** against `next start`.
   - CI env: `DB_TARGET=ci`, `DEMO_MODE=true`, throwaway `AUTH_SECRET`, and the cookie-minting globalSetup from #1. Smoke only until #1 lands, then the suite grows with each feature.
   - Runs on every PR and push to main.
5. **Set up Vercel + Neon environments, preview deploys, and security scanning.** Dev, est 3, backend.
   - Applies the environment table above, with per-env secret scopes.
   - CodeQL workflow and `dependabot.yml`.
6. **Spike: compare real price and promo-code data APIs.** Dev, est 2, backend.
   - `docs/data-sources.md` covers at least 3 options: coverage of the PRD stores, free tier, rate limits, and ToS on caching and display.
   - Ends with a recommendation. The user decides. No scraping.
7. **Build app shell, sign-in page, and Demo-data banner.** Kunal, est 3, frontend.
   - Responsive nav: bottom tab bar on mobile, left sidebar at md and up (P1 layout).
   - Header with user menu and sign-out.
   - `/signin` page with a Google button.
   - Reusable `<DemoDataBadge>`.
   - Loading and error states.
   - E2E: anonymous users see `/signin`; signed-in users see the shell.
8. **Build wishlist UI with add/edit/delete sheet and cheapest price (Story 7).** Kunal, est 5, frontend. Consumes #3.
9. **Build cross-store comparison table with Cheapest badge and used/resale tags (Story 3).** Kunal, est 5, frontend. **HW3 feature.** Consumes #3 and may start from the HW3 "after" branch.
10. **Build live codes view with copy, filter, show-dead toggle, and mark dead/alive (Story 1).** Kunal, est 5, frontend. Shows "checked Xh ago" and the code terms. Consumes #3.

**Sprint 2 (9)**

11. **Build watches and alerts API with refresh, cron, and alert evaluation.** Dev, est 8, backend.
    - Routes: `GET/POST/DELETE /api/watches`, `GET /api/alerts`, `PATCH /api/alerts/[id]`, `POST /api/alerts/clear`. They include ownership integration tests and a watch cap per user (PRD alert noise).
    - `lib/alerts.ts` pure evaluation: price at or below target (or any drop), and stock at or below threshold.
    - Ingestion: Vercel Cron calls `GET /api/cron/refresh`, scheduled in `vercel.json` with `CRON_SECRET` bearer auth. Daily is the Hobby-tier limit, so the cadence goes in the README.
    - "Refresh now": a session-auth `POST /api/items/[id]/refresh`, rate-limited to 1 per item per 5 min.
    - On each run: updates listings and price history and evaluates watches.
    - **Transition-based alert dedupe:** an alert is created only on a false→true flip of `priceCondMet` or `stockCondMet`. The flip is an atomic conditional update: `updateMany({ where: { id, priceCondMet: false }, data: { priceCondMet: true } })`. The alert is inserted only if `count === 1`, inside the same transaction. That way concurrent cron and "Refresh now" runs, or retries, can't both win. When the condition goes back to false, the flag resets with the same conditional pattern, so a later recurrence alerts again.
    - Tests cover repeated polls (no duplicates), retrying the same ingestion (no duplicates), **two concurrent refreshes via `Promise.all` (exactly one alert)**, recover-then-recur (new alert), and deleting a watch (no new alerts).
    - A deterministic `POST /api/demo/simulate` (guarded) drives the integration and E2E tests.
12. **Integrate chosen real data source behind an adapter with demo fallback.** Dev, est 5, backend.
    - Depends on #6.
    - Each listing carries a `source: "live" | "demo"` field so the UI can label it.
13. **Write OpenAPI spec, served Swagger page, and DB schema diagram.** Dev, est 3, docs.
14. **Write README setup and deployment guide and environment matrix.** Dev, est 3, docs. The README names the update mechanism (cron + Refresh now + 60s client polling) as the complex-state feature.
15. **Build watch panel and alerts view with unread badge and 60s polling (Story 4).** Kunal, est 5, frontend.
    - Alerts are grouped by item, with mark read and clear.
    - Delete-watch confirmation.
    - **"Refresh now" button on Item Detail.** Depends on the #11 contract. Shows a loading state, a rate-limit message (429 with retry time), and an error state. On success it re-renders the comparison table and refetches alerts.
    - E2E: create watch, simulate, see the price-drop alert, delete the watch. Also: click Refresh now and see the comparison prices update, then any new alert appear.
16. **Build Best Deal card and settings sheet with freshness window and first-order toggle (Story 2).** Kunal, est 5, frontend.
    - Shows price minus code minus cashback.
    - Every code card has a cashback chip.
17. **Show trust badges, Low-trust warning, and cheapest trusted alternative (Story 6).** Kunal, est 3, frontend. Uses `trustFlags` from #3.
18. **Release: full E2E pass, a11y audit, production smoke, architecture diagram, 10-minute demo video.** Kunal, est 5, frontend.
19. **Submission checklist and contribution log (tracking issue).** Kunal, est 2, docs. Checklist:
    - [ ] Canvas P2 group formed (by Nov 2)
    - [ ] Sprint 1 and Sprint 2 planning notes, written jointly
    - [ ] Sprint retros with partner feedback
    - [ ] At least 5 visible PR reviews by each partner (Dev reviews Kunal's UI PRs; Kunal reviews Dev's API PRs)
    - [ ] Both partners contributed substantively to AGENTS.md
    - [ ] Each partner's separate 300-word reflection submitted
    - [ ] `docs/contributions.md` (who did what)
    - [ ] Demo video linked
    - [ ] Production URL linked
    - [ ] HW3 submission done (today)

**Split:**
- Dev owns 10 issues (1-6, 11-14): backend, DB, DevOps, API docs. Est 40.
- Kunal owns 9 issues (7-10, 15-19): UI, E2E, a11y, release. Est 38.
- Both partners have 4 or more issues in each sprint, so both commit histories grow through both sprints.
- Reviews cross over naturally: every UI PR is reviewed by Dev, and every API PR by Kunal. That alone gives each partner more than 5 reviews.

### 7. Agile tracking
- Standups go in an issue per sprint, "Sprint N standups", as comments in the did / next / blocked format.
  - Sprint 1 dates: Oct 31, Nov 2, Nov 4.
  - Sprint 2 dates: Nov 6, Nov 9, Nov 11.
  - Each partner posts on all three.
- Planning notes: `docs/sprints/sprint-1-plan.md` (Oct 31) and `docs/sprints/sprint-2-plan.md` (Nov 6). Both partners edit them.
- Retros: `docs/retros/sprint-1.md` (Nov 5) and `docs/retros/sprint-2.md` (Nov 12), with a partner-feedback section.

### 8. HW3 before/after test (today, fixture-backed, no DB or auth)
- **Shared setup:**
  - `hw3-baseline` already contains the scaffold and `fixtures/comparison.json`.
  - Before branch: `git switch -c hw3/before-comparison hw3-baseline`.
  - After branch: `git switch -c hw3/after-comparison hw3-baseline`, then `git cherry-pick <AGENTS.md commit>`, so the only difference is the rules commit.
  - Record both starting SHAs in the scorecard.
  - Same acceptance checks: Story 3 AC as a Playwright and Vitest checklist.
  - Same model, recorded in the scorecard.
- **Before** (`hw3/before-comparison`):
  - Confirm no AGENTS.md exists on the branch.
  - Check Antigravity's rules and customization settings and the global rules file for any active rules. Disable them and screenshot the empty rules panel.
  - Fresh chat with the brief prompt: "Build a cross-store price comparison for an item using fixtures/comparison.json."
  - Commit the output as-is.
- **After** (`hw3/after-comparison`):
  - AGENTS.md is present. Screenshot it as loaded.
  - The prompt references Story 3, the fixture, and the AGENTS.md rules.
  - Commit the output, keeping the test-first commit order.
- **Scorecard:** `docs/hw3/before-after.md`. Criteria: pattern consistency, design intent, naming and architecture, and test quality. Each gets a 1-5 score with specific snippets and screenshots. It notes that the richer "after" prompt is part of the context-engineering intervention, not a hidden variable.
- **AGENTS.md refinement:** add rules for any gaps the "after" run still showed, in one commit referencing the scorecard.
- **Reflection:** the user writes 1-2 pages. I give an outline only, no em-dashes. Leave time to submit before 2026-10-31T06:59Z.

### 9. After CI exists
- Muse reviewer: the user creates a fine-grained token (this repo only: PR read/write, contents read) and stores it securely. Comments start with `MUSE-REVIEW:`.

## Agent operating rules
- Source of truth, in this order: this plan, then `AGENTS.md` (once it exists), then the handoff doc. If the plan conflicts with the live Canvas assignment, stop and quote the conflict.
- Work one step at a time, in the "Execution order" below. Don't start the next step until the current one has a Codex GREEN.
- Never invent prices, metrics, or "live" claims. Never add checkout, auto-apply, social feed, or "lowest price ever" wording.
- Never ask for, print, or commit secrets. When a credential is needed, stop and ask the user to enter it themselves (Vercel/GitHub UI, `.env.local`).
- Commits: small, `type(#issue): msg`. No pushes to `main` except the step 1 scaffold, the fixture commit, and the AGENTS.md commit. Everything else goes through branch + PR.
- Plain wording in all docs: no em-dashes, no filler.
- Shell commands that create remote state (`gh label/issue/project/api --method POST`) must be idempotent. Check existence first (`gh label list`, `gh issue list --search`, and so on) so a re-run doesn't duplicate anything.

## Codex review gate (mandatory for every unit of work)
A **unit** is one row of the "Execution order" table below. Later, in Sprint work, each issue PR is also a unit. A unit is done only after Codex returns `VERDICT: GREEN` on its evidence.

**Runnable recipe.** The agent runs this from the repo root. `.review/` is gitignored; add it to `.gitignore` in row 1.
```bash
ROW=3                    # execution row number
BASE=<sha before row>    # record it at row start: git rev-parse HEAD
mkdir -p .review
{
cat <<'PROMPT'
Review this unit of LootLens work against the PLAN SECTION and AGENTS.md (if present).
Check: correctness, plan compliance, security (secrets, authz, prod-DB safety),
tests (TDD commit order, AC coverage), idempotency of remote changes, wording rules
(no em-dashes). Do not modify files.
Output exactly "VERDICT: GREEN" or "VERDICT: CHANGES REQUESTED", then numbered findings
"[high|med|low] problem -> fix". GREEN only if no high/med findings remain.
PROMPT
echo "## PLAN SECTION"; cat .review/row-$ROW-plan.md     # agent copies the relevant plan rows/steps here
echo "## PRIOR FINDINGS AND RESOLUTION"; cat .review/row-$ROW-prior.md 2>/dev/null
echo "## EVIDENCE"; cat .review/row-$ROW-evidence.txt   # built per row, see table
} > .review/row-$ROW-input.txt
codex exec -m gpt-6-astra -s read-only -C "$PWD" - < .review/row-$ROW-input.txt | tee .review/row-$ROW-round-N.out
```

**Rules:**
1. On CHANGES REQUESTED, fix every high and med finding. Write what each prior finding became into `.review/row-$ROW-prior.md`, rebuild the evidence, and re-run. Fix low findings if cheap; otherwise log them as deferred.
2. **Max 3 rounds per unit.** If round 3 is still not GREEN, stop and show the user the open findings. Never override Codex on your own.
3. **Log every round** in `docs/reviews/codex-log.md`: date, row, round, base SHA, verdict, findings, and how each was resolved. Commit the log with the unit (or with the next commit, for remote-only rows). This is evidence for the AI Mastery rubric.
4. Codex reviews are an extra check. They never replace Kunal's PR reviews.

## Execution order, evidence, and stop points
Prerequisite: the approved plan is saved at `docs/phase0-plan.md` and this kickoff is at `docs/phase0-agent-prompt.md`. Both are written before the agent starts.

| Row | Unit (plan step) | Evidence for Codex | Stop for user |
|---|---|---|---|
| 0 | `project` scope check | none (check only): `gh auth status` | if the scope is missing, the user runs `gh auth refresh -s project` |
| 1 | Step 1 scaffold, fixture, `hw3-baseline` tag | `git log --oneline $BASE..HEAD`, `git diff $BASE..HEAD -- . ':!package-lock.json'`, `git tag -l hw3-baseline`, and output of `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build` | no |
| 2 | Step 2 AGENTS.md | draft diff, `git log`, and confirmation that the `hw3-baseline` tag doesn't contain AGENTS.md (`git ls-tree hw3-baseline AGENTS.md` returns nothing) | **yes:** the user approves the draft before the commit and push |
| 3 | Steps 3-4 labels + milestones | `gh label list --json name,color`, `gh api repos/devpatel25/LootLens/milestones` | no |
| 4 | Step 5.1-5.5 board create, link, public, Status options, Estimate field | `gh api graphql` query of the project: `public`, `title`, `repositories{nodes{nameWithOwner}}`, and `fields` including Status options and Estimate | **yes:** the user switches the view to Board layout in the UI, opens the board URL signed out, and confirms with a screenshot path. Codex gets that confirmation as evidence |
| 5 | Step 6 all 19 issues + Step 5.6 board population | `gh issue list --state all --json number,title,labels,milestone,body --limit 50`, `gh project item-list <n> --owner devpatel25 --format json` (Status + Estimate per item), and count checks (S1 = 10, S2 = 9, owner:dev = 10, owner:kunal = 9) | no |
| 6 | Step 7 standup issues + sprint-1 plan skeleton | issue JSON for the two standup issues, plus the `docs/sprints/sprint-1-plan.md` diff | no |
| 7a | Step 8 setup: both branches, `docs/hw3/prompts.md` (exact before/after prompts), scorecard template | `git log --oneline hw3-baseline..hw3/before-comparison` and the same for `hw3/after-comparison` (after must show only the cherry-picked AGENTS.md commit), plus the prompts and template diff | **yes:** the user runs both builds in Antigravity and commits each output on its branch. The user then gives the agent: both output SHAs, the model name and settings, a screenshot of the empty rules panel (before), and a screenshot of AGENTS.md loaded (after) |
| 7b | Step 8 scorecard | the before and after logs and diffs from `hw3-baseline`, test results on each branch, the filled scorecard diff, and the list of screenshot paths referenced | no |
| 8 | Step 8 AGENTS.md refinement + reflection outline | AGENTS.md diff referencing the scorecard, plus the outline file (outline only; the user writes the reflection) | **yes:** the user writes and submits the HW3 reflection by 2026-10-31T06:59Z |

**Deferred, not part of today's run:**
- Kunal's Project access and his confirmation from his account happen after he accepts the invite. They don't block anything.
- The Muse reviewer token waits until issue #4 (CI) lands. Do not configure it in Phase 0.

After each row, report to the user in 3-5 lines: what changed, the Codex verdict and number of rounds, and the next row.

## Verification
- `gh label list`, `gh api repos/devpatel25/LootLens/milestones`, `gh issue list --milestone "Sprint 1"` (10) and `--milestone "Sprint 2"` (9).
- `gh issue list --label owner:dev` returns 10 and `--label owner:kunal` returns 9.
- `gh project item-list <n> --owner devpatel25 --format json` shows Status and Estimate set on all 19 issues.
- The board is visible signed out, with 5 columns in Board layout.
- On the scaffold: `npm run lint`, `typecheck`, `test`, `test:e2e`, and `build` all pass locally.
- Deferred to Sprint 1, not a Phase 0 check: CI green on PRs starts once issue #4 lands. The HW3 branches are experiment records. They may stay unmerged, or wait for CI and Kunal's review.
- HW3: both branches exist from `hw3-baseline`, and the scorecard has screenshots and snippets for both.

---

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
