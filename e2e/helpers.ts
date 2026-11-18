import AxeBuilder from "@axe-core/playwright";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** The seeded item's id, found by name through the API, the same way the screens get it. */
export async function itemId(request: APIRequestContext, name: string): Promise<string> {
  const res = await request.get("/api/items");
  expect(res.ok(), `GET /api/items answered ${res.status()}`).toBe(true);
  const { data } = (await res.json()) as { data: { id: string; name: string }[] };
  const item = data.find((i) => i.name === name);
  if (!item) throw new Error(`No item named "${name}" for this test user`);
  return item.id;
}

/** WCAG 2.2 A and AA, the level the course and docs/a11y-audit.md use. */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Runs axe on the page and fails with one line per violation: rule, impact, and where. */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}
