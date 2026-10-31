import { expect, test } from "@playwright/test";

test("shopper compares an item's price across stores", async ({ page }) => {
  await page.goto("/items/item-samba");

  await expect(page.getByRole("heading", { name: "Adidas Samba OG" })).toBeVisible();
  await expect(page.getByText("Demo data", { exact: true })).toBeVisible();

  const table = page.getByRole("table", { name: /Adidas Samba OG/ });
  await expect(table.getByRole("columnheader", { name: "Price" })).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(6);

  const cheapest = table.getByRole("row", { name: /Cheapest/ });
  await expect(cheapest).toHaveCount(1);
  await expect(cheapest).toContainText("Facebook Marketplace");
  await expect(cheapest).toContainText("Used");

  await expect(table.getByRole("row", { name: /Amazon/ })).toContainText("Out of stock");
});

test("unknown item shows not found", async ({ page }) => {
  const res = await page.goto("/items/does-not-exist");
  expect(res?.status()).toBe(404);
});
