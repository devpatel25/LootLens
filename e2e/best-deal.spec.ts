import { expect, test, type APIRequestContext } from "@playwright/test";

async function itemId(request: APIRequestContext, name: string): Promise<string> {
  const { data } = (await (await request.get("/api/items")).json()) as { data: { id: string; name: string }[] };
  return data.find((i) => i.name === name)!.id;
}

test("Best Deal subtracts the best code from the price and shows the total", async ({ page, request }) => {
  await page.goto(`/items/${await itemId(request, "Mechanical keyboard")}`);
  const card = page.getByRole("region", { name: "Best deal" });
  await expect(card.getByText("Best total of the stores shown: $44.99 at Target")).toBeVisible();
  await expect(card.getByRole("row", { name: /^Price/ })).toContainText("$94.99");
  await expect(card.getByRole("row", { name: /^Code TGT50/ })).toContainText("minus $50.00");
  await expect(card.getByRole("row", { name: /^Cashback/ })).toContainText("No cashback");
  await expect(card.getByRole("row", { name: /^Total/ })).toContainText("$44.99");
});

test("Best Deal with no applicable code", async ({ page, request }) => {
  await page.goto(`/items/${await itemId(request, "Adidas Samba OG")}`);
  const card = page.getByRole("region", { name: "Best deal" });
  await expect(card.getByText("Best total of the stores shown: $60.00 at Facebook Marketplace")).toBeVisible();
  await expect(card.getByRole("row", { name: /^Code/ })).toContainText("No code applies");
});

test("code cards show a cashback chip", async ({ page }) => {
  await page.goto("/codes");
  await expect(page.getByRole("listitem", { name: "Code SAMBA20" }).getByText("Cashback: DemoCash 5%")).toBeVisible();
  await expect(page.getByRole("listitem", { name: "Code TGT50" }).getByText("No cashback")).toBeVisible();
});
