import { describe, expect, it } from "vitest";
import { routeDecision, signInUrl } from "@/lib/authConfig";
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import { config } from "@/proxy";

describe("routeDecision signed out", () => {
  it.each([
    ["/wishlist", "redirect"],
    ["/", "redirect"],
    ["/api/items", "unauthorized"],
    ["/api", "unauthorized"],
    ["/api/health", "next"],
    ["/api/health/", "next"],
    ["/api/cron/refresh", "next"],
    ["/api/auth/signin", "next"],
    ["/signin", "next"],
    ["/api/healthz", "unauthorized"],
    ["/api/cronjob", "unauthorized"],
    ["/signinx", "redirect"],
    ["/apix", "redirect"],
  ])("%s -> %s", (path, want) => {
    expect(routeDecision(path, false)).toBe(want);
  });
});

describe("routeDecision signed in", () => {
  it.each(["/wishlist", "/api/items"])("%s -> next", (path) => {
    expect(routeDecision(path, true)).toBe("next");
  });
});

describe("signInUrl", () => {
  it("keeps the destination", () => {
    expect(signInUrl("/items/1", "?size=9")).toBe("/signin?callbackUrl=%2Fitems%2F1%3Fsize%3D9");
  });
  it("works without a query", () => {
    expect(signInUrl("/wishlist", "")).toBe("/signin?callbackUrl=%2Fwishlist");
  });
});

describe("proxy matcher", () => {
  const matchers = config.matcher as string[];
  // Next compiles each matcher with path-to-regexp and matches the whole path.
  const regexes = matchers.map((m) => pathToRegexp(m));
  const matched = (p: string) => regexes.some((r) => r.test(p));

  it("always matches /api through its own entry", () => {
    expect(matchers).toContain("/api/:path*");
  });
  it.each(["/next.svg", "/x.JPG", "/robots.txt", "/favicon.ico", "/sitemap.xml", "/manifest.webmanifest", "/_next/static/a.js"])(
    "excludes %s",
    (p) => expect(matched(p)).toBe(false),
  );
  it.each(["/items/abc.png", "/robots.txt/x", "/favicon.ico/x", "/sitemap.xml.bak", "/wishlist", "/api/x.json", "/api", "/"])(
    "matches %s",
    (p) => expect(matched(p)).toBe(true),
  );
});
