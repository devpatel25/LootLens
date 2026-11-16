import { describe, expect, it } from "vitest";
import { routeDecision, signInUrl } from "@/lib/authConfig";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
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
    ["/api-docs", "next"],
    ["/openapi.json", "next"],
    ["/api-docsx", "redirect"],
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
  const matched = (url: string) => unstable_doesMiddlewareMatch({ config, url });

  it("always matches /api through its own entry", () => {
    expect(matchers).toContain("/api/:path*");
  });
  it.each(["/next.svg", "/x.JPG", "/robots.txt", "/favicon.ico", "/sitemap.xml", "/manifest.webmanifest", "/_next/static/a.js"])(
    "excludes %s",
    (p) => expect(matched(p)).toBe(false),
  );
  it.each(["/items/abc.png", "/robots.txt/x", "/favicon.ico/x", "/sitemap.xml.bak", "/wishlist", "/api/x.json", "/api", "/", "/api-docs", "/openapi.json"])(
    "matches %s",
    (p) => expect(matched(p)).toBe(true),
  );
});
