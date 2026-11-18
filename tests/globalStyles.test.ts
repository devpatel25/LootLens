import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

describe("app/globals.css", () => {
  // app/global-error.tsx replaces the root layout, so the Geist font variables are not set there. A var()
  // with no fallback makes the whole font-family invalid and the page falls back to the browser serif.
  it("gives the sans font variable a fallback, so pages without the Geist classes stay sans-serif", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-geist-sans,\s*ui-sans-serif/);
  });
});
