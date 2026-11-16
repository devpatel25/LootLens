import { expect, test } from "@playwright/test";

// Each test gets its own item, so simulated price drops and refreshes never touch the seeded items
// that other spec files check. Deleting the item also deletes its watches and alerts.
let itemId = "";
let name = "";

test.beforeEach(async ({ request }) => {
  name = `E2E watch ${Date.now()} ${Math.floor(Math.random() * 1e6)}`;
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
  const before = await table.locator("tbody tr").first().locator("td").nth(2).textContent();

  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Prices updated\. \d+ new alerts?\./ })).toBeVisible();
  await expect(table.locator("tbody tr").first().locator("td").nth(2)).not.toHaveText(before ?? "");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Alerts" })).toHaveAccessibleDescription(
    /\d+ unread alerts?/,
  );

  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Prices were refreshed a moment ago\. Try again in/ })).toBeVisible();
});
