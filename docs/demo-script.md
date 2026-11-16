# 10-minute demo script

A plan for the recorded demo (issue #18). Every screen shown uses seeded demo data, and the "Demo data" badge is on screen the whole time; say so once at the start.

**Before recording**

- Use a preview or local build with `DEMO_MODE=true` and fresh seed data (`npm run db:seed`), so Refresh now and the simulated price drop work.
- Sign in once in the browser you will record, then sign out, so the Google step is quick on camera.
- Close other tabs, set the window to about 1280px wide, and zoom the browser to 110% so text is readable in the video.

| Time | Who | Show | Say (in short) |
|---|---|---|---|
| 0:00 to 0:45 | Kunal | Title slide or the sign-in page | What LootLens is: one place to see where an item is cheapest in your size, which promo codes still work, and alerts for price drops and low stock. Built by Dev (backend) and Kunal (frontend). All data in the demo is labelled demo data. |
| 0:45 to 1:30 | Kunal | Sign in with Google, land on the Wishlist | One-click sign-in, no password, no marketing email (story 5). Each card shows your size and the cheapest store for it. |
| 1:30 to 2:45 | Kunal | Add item, show a field error, save; edit it; delete it with the confirm | Story 7: full add, edit, delete; it is saved on the server, so reload to prove it. |
| 2:45 to 4:15 | Kunal | Open Adidas Samba OG | Story 3: one table, every store. Cheapest in size 9 is the used $60 pair; used and resale are tagged; Amazon is out of stock in your size. Then the Best Deal card (story 2): price, minus the best code, minus cashback, equals the total. |
| 4:15 to 5:00 | Kunal | Open Denim jacket | Story 6: the cheapest store is a fictional low-trust store (no HTTPS, few photo reviews, low rating), so LootLens names the cheapest trusted alternative, Target at $39.00. |
| 5:00 to 6:15 | Kunal | Codes screen: search, store filter, copy a code, mark one dead, turn on Show dead codes, mark it alive | Story 1: only codes checked recently that still work; "checked 1h ago"; dead codes hidden by default. |
| 6:15 to 6:45 | Kunal | Settings: change the window to 48 hours, show the extra code on Codes, set it back | The freshness window and the first-order toggle decide which codes count. |
| 6:45 to 8:15 | Kunal | Back on an item: set a price watch, press Refresh now, open Alerts, see the badge and the new alert, mark it read, delete the watch | Story 4: price-drop and low-size alerts together, unread badge, checks every 60 seconds; Refresh now is limited to once every 5 minutes. |
| 8:15 to 9:30 | Dev | API docs at `/api-docs`, the database diagram, CI on a PR | How it is built: one Next.js app, API routes, Prisma and Neon, Google sign-in, tests on every PR, the daily refresh job. See `docs/architecture.md`. |
| 9:30 to 10:00 | Both | The Scrum board | How we split and reviewed the work; what we would do next (a real price source, server actions so forms work without JavaScript). |

**After recording:** upload the video, put the link in the README and on issue #19, and tick the demo item on #18.
