import { expect, test } from "@playwright/test";

test("compares store prices for the default size", async ({ page }) => {
  await page.goto("/compare/item-samba");
  await expect(page.getByRole("heading", { name: "Adidas Samba OG" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Demo data");

  const best = page.getByRole("region", { name: "Best prices" });
  await expect(best).toContainText("Lowest price$60.00");
  await expect(best).toContainText("Lowest new price$92.50");

  const stores = page.getByRole("region", { name: "All stores" }).getByRole("listitem");
  await expect(stores).toHaveCount(5);
  await expect(stores.first()).toContainText("Facebook Marketplace");
  await expect(stores.last()).toContainText("Amazon");
  await expect(stores.last()).toContainText("Out of stock");
});

test("switching size re-ranks stores by stock", async ({ page }) => {
  await page.goto("/compare/item-samba");
  await page.getByRole("navigation", { name: "Size" }).getByRole("link", { name: "10" }).click();
  await expect(page).toHaveURL(/size=10/);
  await expect(page.getByRole("heading", { name: "All stores, size 10" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Best prices" })).toContainText(
    "Lowest price$84.99",
  );
});

// Unlisted params stream a 200 shell (partialPrefetching), so assert the not-found UI, not the status.
test("unknown item shows the not-found page", async ({ page }) => {
  await page.goto("/compare/nope");
  await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
});
