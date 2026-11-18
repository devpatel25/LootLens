import { describe, expect, it } from "vitest";
import { authConfig, routeDecision } from "@/lib/authConfig";
import { signInUrl } from "@/lib/signin";
import { isUnder } from "@/lib/paths";
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
    ["/api/cron", "unauthorized"],
    ["/api/cron/other", "unauthorized"],
    ["/signinx", "redirect"],
    ["/apix", "redirect"],
  ])("%s -> %s", (path, want) => {
    expect(routeDecision(path, false)).toBe(want);
  });
});

describe("routeDecision signed in", () => {
  it.each(["/wishlist", "/api/items", "/signinx"])("%s -> next", (path) => {
    expect(routeDecision(path, true)).toBe("next");
  });

  it("sends a signed-in visit to /signin on to its destination", () => {
    expect(routeDecision("/signin", true)).toBe("leave-signin");
    expect(routeDecision("/signin/", true)).toBe("leave-signin");
  });
});

describe("isUnder (shared path rule)", () => {
  it("matches the path itself and anything below it, nothing that only starts the same", () => {
    expect(isUnder("/codes", "/codes")).toBe(true);
    expect(isUnder("/codes/x", "/codes")).toBe(true);
    expect(isUnder("/codes-archive", "/codes")).toBe(false);
    expect(isUnder("/", "/codes")).toBe(false);
  });
});

describe("authConfig pages", () => {
  it("sends Auth.js errors (AccessDenied, Configuration) to our sign-in page, not its built-in error page", () => {
    expect(authConfig.pages).toEqual({ signIn: "/signin", error: "/signin" });
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
