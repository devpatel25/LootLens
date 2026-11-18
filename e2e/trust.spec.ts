import { expect, test } from "@playwright/test";
import { itemId } from "./helpers";

test("a low-trust cheapest store gets a warning and a trusted alternative", async ({ page, request }) => {
  await page.goto(`/items/${await itemId(request, "Denim jacket")}`);
  const kick = page.getByRole("row", { name: /KickSwap/ });
  await expect(kick.getByText("Low-trust")).toBeVisible();
  await expect(kick.getByText("No HTTPS", { exact: true })).toBeVisible();
  await expect(kick.getByText("Cheapest")).toBeVisible();
  const note = page.getByRole("note", { name: "Trust warning" });
  await expect(note).toContainText("The cheapest store shown, KickSwap (fictional demo store), looks low-trust");
  await expect(note).toContainText("Cheapest trusted store shown: $39.00 at Target.");
});

test("a trusted cheapest store shows no warning, and trust signs show on every row", async ({ page, request }) => {
  await page.goto(`/items/${await itemId(request, "Adidas Samba OG")}`);
  await expect(page.getByRole("note", { name: "Trust warning" })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Adidas Official/ }).getByText("420 photo reviews")).toBeVisible();
  await expect(page.getByRole("row", { name: /KickSwap/ }).getByText("Low-trust")).toBeVisible();
});
