import { describe, expect, it } from "vitest";
import { GET } from "@/app/api-docs/route";

describe("GET /api-docs", () => {
  const res = GET();

  it("serves html", () => {
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
  });

  it("stops content sniffing", () => {
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("sends a locked-down CSP", () => {
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
  });

  it("loads scripts and styles from self, not unpkg", async () => {
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).not.toContain("unpkg");
    expect(csp).toMatch(/script-src 'self' 'sha256-/);
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("form-action 'none'");
  });

  it("references local assets with integrity", async () => {
    const html = await GET().text();
    expect(html).not.toContain("unpkg");
    expect(html).toMatch(/<link rel="stylesheet" href="\/swagger-ui\/swagger-ui\.css" integrity="sha384-[^"]+"/);
    expect(html).toMatch(/<script src="\/swagger-ui\/swagger-ui-bundle\.js" integrity="sha384-[^"]+"/);
  });
});
