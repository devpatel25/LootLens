import { expect, test } from "@playwright/test";

// Each test gets its own item, so simulated price drops and refreshes never touch the seeded items
// that other spec files check. Deleting the item also deletes its watches and alerts.
//
// The names are fixed on purpose. Demo listings are generated from the item name, and the demo feed
// takes 10% off and removes one unit of stock. With a random name the cheapest listing can sell out
// and the next cheapest can cost more than the starting price, so no price-drop alert fires (correct
// app behaviour, flaky test). These names were checked to give a drop. The seed deletes the demo
// user's items at the start of every run, so fixed names never collide with leftovers.
const NAMES: Record<string, string> = {
  "create a watch, simulate a drop, see the price-drop alert, delete the watch": "E2E watch drop",
  "Refresh now updates prices and shows the new alert, then rate-limits": "E2E watch refresh",
};
let itemId = "";
let name = "";

test.beforeEach(async ({ request }, testInfo) => {
  name = NAMES[testInfo.title];
  if (!name) throw new Error(`Add a fixed item name for "${testInfo.title}" to NAMES (see the note above).`);
  const res = await request.post("/api/items", {
    data: { name, category: "tech", sizes: ["One size"], selectedSize: "One size", typicalPrice: 50 },
  });
  expect(res.status()).toBe(201);
  itemId = (await res.json()).data.id;
});

test.afterEach(async ({ request }) => {
  await request.delete(`/api/items/${itemId}`);
});

test("create a watch, simulate a drop, see the price-drop alert, delete the watch", async ({ page, request }) => {
  await page.goto(`/items/${itemId}`);
  const panel = page.getByRole("region", { name: "Price watch" });
  await panel.getByRole("button", { name: "Watch this item" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Watching size One size." })).toBeVisible();
  await expect(panel.getByText(/^Size One size: any price drop below \$/)).toBeVisible();

  const sim = await request.post("/api/demo/simulate", { data: { itemId } });
  expect(sim.ok()).toBeTruthy();
  expect((await sim.json()).data.alertsCreated).toBeGreaterThanOrEqual(1);

  await page.goto("/alerts");
  const group = page.getByRole("region", { name });
  await expect(group.getByText(/^Price dropped from \$[\d.]+ to \$[\d.]+$/)).toBeVisible();
  await expect(group.getByText("New", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Alerts" })).toHaveAccessibleDescription(
    /\d+ unread alerts?/,
  );

  await group.getByRole("button", { name: /^Mark read: Price dropped/ }).click();
  await expect(group.getByText("New", { exact: true })).toHaveCount(0);

  const watches = page.getByRole("list", { name: "Active watches" });
  await watches.getByRole("button", { name: `Delete watch for ${name}` }).click();
  await page.getByRole("alertdialog", { name: `Delete the watch for ${name}?` }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("status").filter({ hasText: `Deleted the watch for ${name}.` })).toBeVisible();
  await expect(watches.getByText(name)).toHaveCount(0);
});

test("Refresh now updates prices and shows the new alert, then rate-limits", async ({ page }) => {
  await page.goto(`/items/${itemId}`);
  await page.getByRole("region", { name: "Price watch" }).getByRole("button", { name: "Watch this item" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Watching size One size." })).toBeVisible();

  const table = page.getByRole("table", { name: `Prices for ${name} at every store` });
  // The first store row and its price cell, found by role: the price is the cell that starts with "$".
  const priceCell = table.getByRole("row").nth(1).getByRole("cell").filter({ hasText: /^\$\d/ }).first();
  const before = await priceCell.textContent();

  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Prices updated\. \d+ new alerts?\./ })).toBeVisible();
  await expect(priceCell).not.toHaveText(before ?? "");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Alerts" })).toHaveAccessibleDescription(
    /\d+ unread alerts?/,
  );

  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Prices were refreshed a moment ago\. Try again in/ })).toBeVisible();
});
