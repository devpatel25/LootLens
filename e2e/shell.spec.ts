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

test("the server HTML already marks the current tab, so it is right before JavaScript runs", async ({ request }) => {
  const html = await (await request.get("/codes")).text();
  expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/codes"|<a[^>]*href="\/codes"[^>]*aria-current="page"/);
});

test("on desktop the sidebar stays in view when the page scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/wishlist");
  const position = await page.getByRole("navigation", { name: "Main" }).evaluate((el) => getComputedStyle(el).position);
  expect(position).toBe("sticky");
});

test("a signed-in visit to /signin goes on to its callbackUrl", async ({ request }) => {
  const res = await request.get("/signin?callbackUrl=%2Fcodes", { maxRedirects: 0 });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);
  expect(res.headers()["location"]).toMatch(/\/codes$/);
});

test("a signed-in visit with an error or a request to sign in again still sees the sign-in page", async ({ page }) => {
  // After a demo reset the session can name a user that no longer exists; ?reauth lets that user sign in again.
  await page.goto("/signin?reauth=1&callbackUrl=%2Fcodes");
  await expect(page).toHaveURL(/\/signin\?reauth=1/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.goto("/signin?error=OAuthCallbackError");
  await expect(page.getByText("Google sign-in was cancelled or did not finish. Try again.")).toBeVisible();
});
