import { expect, test } from "@playwright/test";

// Settings are per user. This spec signs in as its own user (created in e2e/auth-setup.ts), so changing the
// freshness window here can never change what the demo shopper's specs see while they run in parallel.
test.use({ storageState: "e2e/.auth/settings-user.json" });

// Start from the defaults even on a CI retry after a partial save.
test.beforeEach(async ({ request }) => {
  const reset = await request.patch("/api/settings", { data: { freshnessHours: 24, firstOrderEligible: false } });
  expect(reset.ok()).toBe(true);
});

const card = (page: import("@playwright/test").Page, code: string) => page.getByRole("listitem", { name: `Code ${code}` });

test("settings change the freshness window and persist", async ({ page }) => {
  // SAVE10 was checked 30 hours ago: hidden at the default 24 hours, so the change below is what shows it.
  await page.goto("/codes");
  await expect(page.getByText("Codes checked in the last 24 hours that still work.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Codes" })).toBeVisible();
  await expect(card(page, "SAVE10")).toHaveCount(0);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "24 hours" })).toBeChecked();
  await page.getByRole("radio", { name: "48 hours" }).check();
  await page.getByRole("checkbox", { name: "I can use first-order codes" }).check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Settings saved.");
  await page.reload();
  await expect(page.getByRole("radio", { name: "48 hours" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "I can use first-order codes" })).toBeChecked();

  await page.goto("/codes");
  await expect(page.getByText("Codes checked in the last 48 hours that still work.")).toBeVisible();
  await expect(card(page, "SAVE10")).toBeVisible();
});
