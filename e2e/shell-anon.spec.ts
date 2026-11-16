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
  // Next.js adds its own empty role="alert" route announcer, so match ours by text.
  await expect(page.getByRole("alert").filter({ hasText: "Google sign-in was cancelled or denied. Try again." })).toBeVisible();
});

test("the sign-in page is fully server-rendered: destination and error work before JavaScript", async ({ request }) => {
  const html = await (await request.get("/signin?callbackUrl=%2Fcodes&error=AccessDenied")).text();
  expect(html).toMatch(/name="callbackUrl"[^>]*value="\/codes"|value="\/codes"[^>]*name="callbackUrl"/);
  expect(html).toContain("Google sign-in was cancelled or denied. Try again.");
  expect(html).not.toMatch(/<div hidden id="S:\d+">[\s\S]*Sign in to LootLens/);
});
