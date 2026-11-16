import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Automated WCAG 2.2 A and AA checks on every signed-in screen, at laptop and phone widths.
// Manual checks (keyboard order, focus visibility, screen reader wording) are in docs/a11y-audit.md.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function itemId(request: APIRequestContext, name: string): Promise<string> {
  const { data } = (await (await request.get("/api/items")).json()) as { data: { id: string; name: string }[] };
  return data.find((i) => i.name === name)!.id;
}

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

for (const viewport of [
  { name: "desktop", width: 1280, height: 800, colorScheme: "light" as const },
  { name: "phone", width: 375, height: 812, colorScheme: "light" as const },
  { name: "desktop dark mode", width: 1280, height: 800, colorScheme: "dark" as const },
]) {
  test.describe(`${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: viewport.colorScheme });

    for (const path of ["/wishlist", "/codes", "/codes?showDead=true", "/alerts", "/settings"]) {
      test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoViolations(page);
      });
    }

    for (const name of ["Adidas Samba OG", "Denim jacket"]) {
      test(`Item Detail for ${name} has no WCAG A/AA violations`, async ({ page, request }) => {
        await page.goto(`/items/${await itemId(request, name)}`);
        await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
        await expectNoViolations(page);
      });
    }

    test("the Add item sheet has no WCAG A/AA violations", async ({ page }) => {
      await page.goto("/wishlist");
      await page.getByRole("button", { name: "Add item" }).first().click();
      await expect(page.getByRole("dialog", { name: "Add item" })).toBeVisible();
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Enter a name.")).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
