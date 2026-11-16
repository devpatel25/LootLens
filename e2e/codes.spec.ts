import { expect, test, type Page } from "@playwright/test";

// Codes are shared by every user, so this file runs in order and puts BR10 back the way it found it.
test.describe.configure({ mode: "serial" });

// Put BR10 back even if a test fails half way (and before a CI retry).
test.afterEach(async ({ request }) => {
  await request.patch("/api/codes/code-br-10", { data: { status: "live" } });
});

const list = (page: Page) => page.getByRole("list", { name: "Codes" });
const cards = (page: Page) => list(page).locator(":scope > li");
const card = (page: Page, code: string) => page.getByRole("listitem", { name: `Code ${code}` });

test("shows only live, recently checked, unexpired codes", async ({ page }) => {
  await page.goto("/codes");
  await expect(page.getByRole("heading", { level: 1, name: "Codes" })).toBeVisible();
  await expect(page.getByText("Demo data")).toBeVisible();
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

test("mark dead hides a code at once; show dead codes and mark alive bring it back", async ({ page }) => {
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
});
