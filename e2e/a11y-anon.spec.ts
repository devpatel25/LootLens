import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

for (const [url, colorScheme] of [
  ["/signin", "light"],
  ["/signin?error=AccessDenied", "light"],
  ["/signin?error=AccessDenied", "dark"],
] as const) {
  test(`${url} (${colorScheme}) has no WCAG A/AA violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
