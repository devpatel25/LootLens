import { expect, test } from "@playwright/test";

test("session endpoint returns the demo user", async ({ page }) => {
  const res = await page.request.get("/api/auth/session");
  const body = await res.json();
  expect(body.user.id).toEqual(expect.any(String));
  expect(body.user.email).toBe("demo@lootlens.test");
});

test("signed-in page visit is not sent to sign-in", async ({ page }) => {
  await page.goto("/wishlist");
  await expect(page).not.toHaveURL(/\/signin/);
});
