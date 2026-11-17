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
});
