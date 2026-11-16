import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

// Automated WCAG 2.2 A and AA checks on every signed-in screen, at laptop and phone widths and in dark
// mode. Each case waits for the screen's real content (not its loading state) before scanning.
// Manual checks (keyboard order, focus visibility, screen reader wording) are in docs/a11y-audit.md.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function itemId(request: APIRequestContext, name: string): Promise<string> {
  const { data } = (await (await request.get("/api/items")).json()) as { data: { id: string; name: string }[] };
  return data.find((i) => i.name === name)!.id;
}

async function expectNoViolations(page: Page, ready: Locator) {
  await expect(ready).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

const SCREENS: { path: string; ready: (page: Page) => Locator }[] = [
  { path: "/wishlist", ready: (p) => p.getByRole("list", { name: "Wishlist items" }) },
  { path: "/codes", ready: (p) => p.getByRole("list", { name: "Codes" }) },
  { path: "/codes?showDead=true", ready: (p) => p.getByRole("listitem", { name: "Code DEADDEAL" }) },
  { path: "/alerts", ready: (p) => p.getByRole("heading", { name: "Active watches" }) },
  { path: "/settings", ready: (p) => p.getByRole("button", { name: "Save settings" }) },
  { path: "/items/does-not-exist", ready: (p) => p.getByRole("heading", { level: 1, name: "Item not found" }) },
];

for (const viewport of [
  { name: "desktop", width: 1280, height: 800, colorScheme: "light" as const },
  { name: "phone", width: 375, height: 812, colorScheme: "light" as const },
  { name: "desktop dark mode", width: 1280, height: 800, colorScheme: "dark" as const },
]) {
  test.describe(`${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: viewport.colorScheme });

    for (const { path, ready } of SCREENS) {
      test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
        await page.goto(path);
        await expectNoViolations(page, ready(page));
      });
    }

    for (const name of ["Adidas Samba OG", "Denim jacket", "Mechanical keyboard"]) {
      test(`Item Detail for ${name} has no WCAG A/AA violations`, async ({ page, request }) => {
        await page.goto(`/items/${await itemId(request, name)}`);
        await expectNoViolations(page, page.getByRole("region", { name: "Best deal" }));
      });
    }

    test("the Add item sheet with field errors has no WCAG A/AA violations", async ({ page }) => {
      await page.goto("/wishlist");
      await page.getByRole("button", { name: "Add item" }).first().click();
      await expect(page.getByRole("dialog", { name: "Add item" })).toBeVisible();
      await page.getByRole("button", { name: "Save" }).click();
      await expectNoViolations(page, page.getByText("Enter a name."));
    });

    test("Alerts with real alerts and a watch has no WCAG A/AA violations", async ({ page, request }) => {
      // A throwaway item, so the simulated drop never changes the seeded items other specs check. One fixed
      // name per viewport: demo listings come from the name, and these were checked to give a price drop
      // (see e2e/watches.spec.ts). The seed clears the demo user's items at the start of every run.
      const name = `A11y watch ${viewport.name}`;
      const item = (
        await (await request.post("/api/items", { data: { name, category: "tech", sizes: ["One size"], selectedSize: "One size", typicalPrice: 50 } })).json()
      ).data;
      try {
        expect((await request.post("/api/watches", { data: { itemId: item.id, size: "One size" } })).status()).toBe(201);
        await request.post("/api/demo/simulate", { data: { itemId: item.id } });
        await page.goto("/alerts");
        await expectNoViolations(page, page.getByRole("region", { name, exact: true }).getByText(/^Price dropped from/));
        await page.goto(`/items/${item.id}`);
        await expectNoViolations(page, page.getByRole("button", { name: "Delete watch" }));
      } finally {
        await request.delete(`/api/items/${item.id}`);
      }
    });
  });
}
