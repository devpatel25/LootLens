# Accessibility audit (release, issue #18)

Date: 2026-11-16. Scope: every screen in the app at release, signed in and signed out.

LootLens should work for people who use a keyboard, a screen reader, voice control, zoom, or dark mode. This page records what was checked, what was found, and what was fixed.

## 1. Automated checks (run on every PR)

`e2e/a11y.spec.ts` and `e2e/a11y-anon.spec.ts` run [axe](https://github.com/dequelabs/axe-core) through Playwright against WCAG 2.2 levels A and AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`). A test fails on any violation.

Each case waits for the screen's real content (for example the Save settings button), not its loading state, before scanning. Screens are checked with the seeded demo data unless the row says otherwise.

| Screen and state | 1280px light | 375px light | 1280px dark |
|---|---|---|---|
| Sign in (`/signin`, and with an error message) | pass | n/a | pass |
| Wishlist with items | pass | pass | pass |
| Add item sheet, showing field errors | pass | pass | pass |
| Item Detail, Adidas Samba OG (trusted cheapest, no code applies) | pass | pass | pass |
| Item Detail, Denim jacket (low-trust cheapest, warning shown) | pass | pass | pass |
| Item Detail, Mechanical keyboard (Best Deal with a code) | pass | pass | pass |
| Item Detail with an active watch | pass | pass | pass |
| Item not found | pass | pass | pass |
| Codes, default list | pass | pass | pass |
| Codes, Show dead codes | pass | pass | pass |
| Alerts with no alerts | pass | pass | pass |
| Alerts with a price-drop alert and an active watch | pass | pass | pass |
| Settings | pass | pass | pass |

Not scanned automatically: the error screens (they only appear when something fails) and the delete-confirm dialogs. Both use the same `ErrorState` and dialog components that are covered by component tests for roles, names, and focus.

**Found and fixed:** `label-content-name-mismatch` (serious) on every signed-in screen. The header link's visible text included the logo letter "L", which its accessible name "LootLens home" did not contain (WCAG 2.5.3, Label in Name). Voice-control users say what they see, so "click L LootLens" would not match. The logo mark is now an icon, so the visible text is "LootLens".

## 2. Manual checks

| Area | What was checked | Result |
|---|---|---|
| Keyboard order | Tab through Item Detail from the top: Skip to content, LootLens home, Account menu, Wishlist, Codes, Alerts, Settings, Back to wishlist, Code settings, the watch form, Refresh now, the price table | Logical, matches the visual order |
| Focus visible | Every stop above shows a focus outline (checked with computed styles) | Pass |
| Skip link | First Tab shows "Skip to content" and jumps to the main area | Pass |
| Dialogs | Add, edit, delete, and watch-delete dialogs: focus starts in the dialog (first field, or Cancel for a delete), Escape closes, focus returns to the button that opened it, or to the page heading if that button is gone | Pass (E2E and component tests) |
| Account menu | Opens with Enter, `aria-expanded` changes, Escape closes and returns focus | Pass (component tests) |
| Labels | Every input has a visible label; errors are tied to fields with `aria-describedby` and `aria-invalid` | Pass |
| Button names | Repeated buttons say what they act on and start with their visible text ("Mark dead SAMBA20", "Edit Adidas Samba OG", "Mark read: Price dropped ...") | Pass |
| Colour is never the only signal | Cheapest, Low-trust, Fictional, Dead, Expired, Not checked recently, New, Used, Resale, Out of stock are all text | Pass |
| Live updates | Status lines (`role="status"`) announce saves, deletes, copies, marks, and refreshes; errors use `role="alert"` | Pass |
| Unread badge | The Alerts link keeps the name "Alerts"; the count is its description ("3 unread alerts") | Pass |
| Money | Minus amounts in the Best Deal card are read as "minus $40.00" | Pass |
| Small screens | No sideways page scroll at 375px; the price table scrolls inside its own focusable region; the Low-trust label sits by the store name so it is visible without scrolling | Pass |
| Motion | Spinners stop under `prefers-reduced-motion` | Pass |

## 3. Known limits and follow-ups

These are not WCAG failures, but they are worth knowing. Each one is filed as a follow-up issue (linked in the PR for #18).

1. **Signed-in screens need JavaScript.** They stream their data behind `<Suspense>`, and streamed content stays hidden until JavaScript runs. The sign-in page is server-rendered and works without it.
2. **The price table is wide.** On a phone it scrolls sideways inside its own box. A stacked card layout for phones would be easier to read.
3. **Screen reader testing.** The checks above use the accessibility tree (Testing Library and Playwright roles, axe). A pass with VoiceOver on iOS and NVDA on Windows is still worth doing before the demo.

## How to run the checks

```bash
npm run test:e2e -- e2e/a11y.spec.ts e2e/a11y-anon.spec.ts
```
