import { describe, expect, it } from "vitest";
import { routeDecision } from "@/lib/authConfig";

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
