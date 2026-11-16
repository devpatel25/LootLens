import { expect, test } from "@playwright/test";

test("home sends a signed-in user to the wishlist inside the shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/wishlist$/);
  await expect(page.getByRole("heading", { level: 1, name: "Wishlist" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Wishlist" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Account menu for Demo Shopper" })).toBeVisible();
});

test("main nav moves between screens", async ({ page }) => {
  await page.goto("/wishlist");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of ["Codes", "Alerts", "Settings", "Wishlist"]) {
    await nav.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
  }
});

test("nav is a left sidebar on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/wishlist");
  const box = await page.getByRole("navigation", { name: "Main" }).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeLessThan(5);
  expect(box!.height).toBeGreaterThan(400);
  expect(box!.width).toBeLessThan(320);
});

test("nav is a bottom tab bar on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/wishlist");
  const box = await page.getByRole("navigation", { name: "Main" }).boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(810);
  expect(box!.width).toBeGreaterThan(370);
  await expect(page.getByRole("button", { name: /Account menu/ })).toBeVisible();
});

test("a signed-in user who opens /signin goes to the wishlist", async ({ page }) => {
  await page.goto("/signin");
  await expect(page).toHaveURL(/\/wishlist$/);
});

test("sign out returns to the sign-in page and protects the app again", async ({ page }) => {
  await page.goto("/wishlist");
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/signin/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.goto("/wishlist");
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fwishlist/);
});
