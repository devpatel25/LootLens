# 10-minute demo script

A plan for the recorded demo (issue #18). Every screen shown uses seeded demo data, and the "Demo data" badge is on screen the whole time; say so once at the start.

**Before recording**

The seeded items (Adidas Samba OG, Mechanical keyboard, Denim jacket) belong to the seeded demo shopper, `demo@lootlens.test`. A real Google account starts with an empty wishlist. So record most of the demo on a local build signed in as the demo shopper, and show real Google sign-in once on the deployed preview.

1. Start Docker, then run `npm run db:up` and `npm run db:test:migrate` (once).
2. Run `npx playwright test e2e/smoke.spec.ts`. It builds the app, reseeds the test database with fresh demo data, and writes the demo shopper's session cookie to `e2e/.auth/user.json`.
3. Start the build: `set -a; . ./.env.test; set +a; npx next start -p 3100`. `.env.test` sets `DEMO_MODE=true`, so Refresh now and the simulated price drop work.
4. Open `http://localhost:3100`, then in the browser's developer tools add a cookie for `localhost` named `authjs.session-token` with the `value` from `e2e/.auth/user.json`. Reload: you are signed in as Demo Shopper.
5. Close other tabs, set the window to about 1280px wide, and zoom to 110% so text is readable in the video.

| Time | Who | Show | Say (in short) |
|---|---|---|---|
| 0:00 to 0:45 | Kunal | Title slide or the sign-in page | What LootLens is: one place to see where an item is cheapest in your size, which promo codes still work, and alerts for price drops and low stock. Built by Dev (backend) and Kunal (frontend). All data in the demo is labelled demo data. |
| 0:45 to 1:30 | Kunal | On the preview: Sign in with Google (new, empty wishlist). Then switch to the local build as Demo Shopper | One-click sign-in, no password, no marketing email (story 5). A new account starts empty; the demo shopper has three saved items. Each card shows your size and the cheapest store for it. |
| 1:30 to 2:45 | Kunal | Add item, show a field error, save; edit it; delete it with the confirm | Story 7: full add, edit, delete; it is saved on the server, so reload to prove it. |
| 2:45 to 3:45 | Kunal | Open Adidas Samba OG | Story 3: one table, every store. Cheapest in size 9 is the used $60 pair; used and resale are tagged; Amazon is out of stock in your size. |
| 3:45 to 4:15 | Kunal | Open Mechanical keyboard, point at the Best Deal card | Story 2: price $94.99 at Target, minus the TGT50 code ($50.00), no cashback, equals $44.99, which beats the lower sticker prices elsewhere. |
| 4:15 to 5:00 | Kunal | Open Denim jacket | Story 6: the cheapest store is a fictional low-trust store (no HTTPS, few photo reviews, low rating), so LootLens names the cheapest trusted alternative, Target at $39.00. |
| 5:00 to 6:15 | Kunal | Codes screen: search, store filter, copy a code, mark one dead, turn on Show dead codes, mark it alive | Story 1: only codes checked recently that still work; "checked 1h ago"; dead codes hidden by default. |
| 6:15 to 6:45 | Kunal | Settings: change the window to 48 hours, show the extra code on Codes, set it back | The freshness window and the first-order toggle decide which codes count. |
| 6:45 to 8:15 | Kunal | On Mechanical keyboard: set a price watch (any drop), press Refresh now (the demo feed lowers prices by 10%), open Alerts, see the badge and the new alert, mark it read, delete the watch | Story 4: price-drop and low-size alerts together, unread badge, checks every 60 seconds; Refresh now is limited to once every 5 minutes, so press it once. |
| 8:15 to 9:30 | Dev | API docs at `/api-docs`, the database diagram, CI on a PR | How it is built: one Next.js app, API routes, Prisma and Neon, Google sign-in, tests on every PR, the daily refresh job. See `docs/architecture.md`. |
| 9:30 to 10:00 | Both | The Scrum board | How we split and reviewed the work; what we would do next (a real price source, server actions so forms work without JavaScript). |

**After recording:** upload the video, put the link in the README and on issue #19, and tick the demo item on #18.
