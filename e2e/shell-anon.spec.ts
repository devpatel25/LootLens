import { expect, test } from "@playwright/test";

test("signed-out visit shows the sign-in page with one Google button", async ({ page }) => {
  await page.goto("/codes");
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fcodes/);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to LootLens" })).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
});

test("sign-in page explains a failed sign-in", async ({ page }) => {
  await page.goto("/signin?error=AccessDenied");
  await expect(page.getByRole("alert")).toContainText("Google sign-in was cancelled or denied. Try again.");
});
