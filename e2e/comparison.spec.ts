import { expect, test, type APIRequestContext } from "@playwright/test";

async function itemId(request: APIRequestContext, name: string): Promise<string> {
  const res = await request.get("/api/items");
  expect(res.ok()).toBeTruthy();
  const { data } = (await res.json()) as { data: { id: string; name: string }[] };
  const item = data.find((i) => i.name === name);
  expect(item, `seeded item ${name}`).toBeTruthy();
  return item!.id;
}

test("Item Detail compares every store and marks the cheapest in the saved size", async ({ page, request }) => {
  const id = await itemId(request, "Adidas Samba OG");
  await page.goto(`/items/${id}`);

  await expect(page.getByRole("heading", { level: 1, name: "Adidas Samba OG" })).toBeVisible();
  await expect(page.getByText("Demo data")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Wishlist" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const table = page.getByRole("table", { name: "Prices for Adidas Samba OG at every store" });
  await expect(table.getByRole("columnheader", { name: "Size 9 stock" })).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(6);

  const cheapest = table.getByRole("row", { name: /Facebook Marketplace/ });
  await expect(cheapest.getByText("Cheapest")).toBeVisible();
  await expect(cheapest.getByText("Used")).toBeVisible();
  await expect(table.getByText("Cheapest")).toHaveCount(1);
  await expect(table.getByRole("row", { name: /KickSwap/ }).getByText("Resale")).toBeVisible();
  await expect(table.getByRole("row", { name: /Amazon/ }).getByText("Out of stock")).toBeVisible();
});

test("an unknown item shows Item not found", async ({ page }) => {
  await page.goto("/items/does-not-exist");
  await expect(page.getByRole("heading", { name: "Item not found" })).toBeVisible();
  await page.getByRole("link", { name: "Back to wishlist" }).click();
  await expect(page).toHaveURL(/\/wishlist$/);
});

test("on mobile the table scrolls inside its own region", async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const id = await itemId(request, "Adidas Samba OG");
  await page.goto(`/items/${id}`);
  const region = page.getByRole("region", { name: "Prices for Adidas Samba OG at every store" });
  await expect(region).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(375);
});
