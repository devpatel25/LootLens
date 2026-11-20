import { expect, test } from "@playwright/test";

test("home page loads into the app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "LootLens home" })).toBeVisible();
});
