import { describe, expect, it } from "vitest";
import { routeDecision, signInUrl } from "@/lib/authConfig";
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
  const rest = new RegExp(`^${matchers.find((m) => m.startsWith("/(("))!}$`);
  const matched = (p: string) => rest.test(p) || /^\/api(\/.*)?$/.test(p);

  it("always matches /api through its own entry", () => {
    expect(matchers).toContain("/api/:path*");
  });
  it.each(["/next.svg", "/a/b.png", "/x.JPG".toLowerCase(), "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/favicon.ico"])(
    "excludes %s",
    (p) => expect(rest.test(p)).toBe(false),
  );
  it.each(["/wishlist", "/api/items", "/api/x.json", "/items/1"])("matches %s", (p) => expect(matched(p)).toBe(true));
});
