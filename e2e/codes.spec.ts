import { expect, test, type Page } from "@playwright/test";

// Codes are shared by every user, so this file runs in order. Only the mark test changes a code (BR10),
// and it marks it live again in a finally block. That restores its status, not its seeded check time:
// BR10 then reads "checked just now", which no other spec depends on.
test.describe.configure({ mode: "serial" });

const list = (page: Page) => page.getByRole("list", { name: "Codes" });
const cards = (page: Page) => list(page).locator(":scope > li");
const card = (page: Page, code: string) => page.getByRole("listitem", { name: `Code ${code}` });

test("shows only live, recently checked, unexpired codes", async ({ page }) => {
  await page.goto("/codes");
  await expect(page.getByRole("heading", { level: 1, name: "Codes" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Demo data")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Show dead codes" })).not.toBeChecked();
  for (const code of ["SAMBA20", "SAVE25", "WELCOME15", "TGT50", "BR10"]) await expect(card(page, code)).toBeVisible();
  await expect(cards(page)).toHaveCount(5);
  await expect(card(page, "SAMBA20").getByText("checked 1h ago")).toBeVisible();
  await expect(card(page, "SAVE25").getByText("Min spend $150.00")).toBeVisible();
  await expect(card(page, "WELCOME15").getByText("First order only")).toBeVisible();
  for (const hidden of ["SAVE10", "DEADDEAL", "TGT20"]) await expect(card(page, hidden)).toHaveCount(0);
});

test("filter by store and search", async ({ page }) => {
  await page.goto("/codes");
  await page.getByLabel("Store").selectOption("Amazon");
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, "SAVE25")).toBeVisible();
  await page.getByLabel("Store").selectOption("");
  await page.getByLabel("Search codes").fill("tgt");
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, "TGT50")).toBeVisible();
});

test("copy puts the code on the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/codes");
  await page.getByRole("button", { name: "Copy code SAMBA20" }).click();
  await expect(page.getByRole("status")).toContainText("Copied SAMBA20.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("SAMBA20");
});

test("mark dead hides a code at once; show dead codes and mark alive bring it back", async ({ page, request }) => {
  try {
    await markDeadAndBack(page);
  } finally {
    await request.patch("/api/codes/code-br-10", { data: { status: "live" } });
  }
});

async function markDeadAndBack(page: Page) {
  await page.goto("/codes");
  await page.getByRole("button", { name: "Mark dead BR10" }).click();
  await expect(card(page, "BR10")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Marked BR10 dead.");
  await page.reload();
  await expect(card(page, "BR10")).toHaveCount(0);

  await page.getByRole("checkbox", { name: "Show dead codes" }).check();
  await expect(page).toHaveURL(/\/codes\?showDead=true$/);
  await expect(card(page, "BR10").getByText("Dead", { exact: true })).toBeVisible();
  await expect(card(page, "DEADDEAL").getByText("Dead", { exact: true })).toBeVisible();
  await expect(card(page, "SAVE10").getByText("Not checked recently")).toBeVisible();
  await expect(card(page, "TGT20").getByText("Expired", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mark alive BR10" }).click();
  await expect(page.getByRole("status")).toContainText("Marked BR10 alive.");
  await page.getByRole("checkbox", { name: "Show dead codes" }).uncheck();
  await expect(page).toHaveURL(/\/codes$/);
  await expect(card(page, "BR10")).toBeVisible();
  await expect(card(page, "BR10").getByText("checked just now")).toBeVisible();
}

test("settings change the freshness window and persist", async ({ page, request }) => {
  try {
    await changeSettings(page);
  } finally {
    // Settings belong to the shared demo user; put back the defaults the other tests expect.
    await request.patch("/api/settings", { data: { freshnessHours: 24, firstOrderEligible: false } });
  }
});

async function changeSettings(page: Page) {
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
}
