import { expect, test } from "@playwright/test";

test("signed-out page visit lands on sign-in", async ({ page }) => {
  await page.goto("/wishlist");
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fwishlist/);
});

test("signed-out API call gets 401 JSON", async ({ request }) => {
  const res = await request.get("/api/items");
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual({ error: { code: "unauthorized", message: "Sign in required" } });
});
