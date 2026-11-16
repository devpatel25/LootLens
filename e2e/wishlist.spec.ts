import { expect, test } from "@playwright/test";

test("wishlist shows each seeded item with its cheapest store", async ({ page }) => {
  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { level: 1, name: "Wishlist" })).toBeVisible();
  await expect(page.getByText("Demo data")).toBeVisible();
  const samba = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Adidas Samba OG" }) });
  await expect(samba.getByText("Size 9")).toBeVisible();
  await expect(samba.getByText("Cheapest: $60.00 at Facebook Marketplace")).toBeVisible();
  await samba.getByRole("link", { name: "Adidas Samba OG" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Adidas Samba OG" })).toBeVisible();
});

test("add, edit, and delete an item; changes persist across reloads", async ({ page }) => {
  const name = `E2E hoodie ${Date.now()}`;
  const renamed = `${name} v2`;
  await page.goto("/wishlist");

  await page.getByRole("button", { name: "Add item" }).first().click();
  const add = page.getByRole("dialog", { name: "Add item" });
  await add.getByLabel("Name").fill(name);
  await add.getByLabel("Category").selectOption("clothes");
  await add.getByLabel("Sizes").fill("S, M, L");
  await add.getByLabel("Your size").selectOption("M");
  await add.getByLabel("Typical price (USD)").fill("40");
  await add.getByRole("button", { name: "Save" }).click();
  await expect(add).toBeHidden();
  await expect(page.getByRole("status")).toContainText(`Added ${name}.`);

  await page.reload();
  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name, exact: true }) });
  await expect(card.getByText("Size M")).toBeVisible();
  await expect(card.getByText(/Cheapest: \$|No store shown has size M in stock/)).toBeVisible();

  await card.getByRole("button", { name: `Edit ${name}` }).click();
  const edit = page.getByRole("dialog", { name: "Edit item" });
  await edit.getByLabel("Name").fill(renamed);
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();
  await page.reload();
  const renamedCard = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: renamed, exact: true }) });
  await expect(renamedCard).toBeVisible();

  await renamedCard.getByRole("button", { name: `Delete ${renamed}` }).click();
  const confirm = page.getByRole("alertdialog", { name: `Delete ${renamed}?` });
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole("status")).toContainText(`Deleted ${renamed}.`);
  await page.reload();
  await expect(page.getByRole("link", { name: renamed, exact: true })).toHaveCount(0);
});

test("the add sheet is keyboard friendly: Escape closes it and focus returns", async ({ page }) => {
  await page.goto("/wishlist");
  const open = page.getByRole("button", { name: "Add item" }).first();
  await open.click();
  const sheet = page.getByRole("dialog", { name: "Add item" });
  await expect(sheet.getByLabel("Name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(open).toBeFocused();
});
