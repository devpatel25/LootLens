import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const [url, colorScheme] of [
  ["/signin", "light"],
  ["/signin?error=AccessDenied", "light"],
  ["/signin?error=AccessDenied", "dark"],
] as const) {
  test(`${url} (${colorScheme}) has no WCAG A/AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
