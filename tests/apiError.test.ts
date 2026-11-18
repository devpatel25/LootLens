import { describe, expect, it, vi } from "vitest";
import { errorResponse, unauthorizedResponse } from "@/lib/apiError";
import { unauthorized } from "@/lib/http";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("apiError", () => {
  it("builds the error body with extra fields and headers", async () => {
    const res = errorResponse(429, "rate_limited", "Slow down", { retryAfterSeconds: 3 }, { "Retry-After": "3" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3");
    expect(await res.json()).toEqual({ error: { code: "rate_limited", message: "Slow down", retryAfterSeconds: 3 } });
  });

  it("proxy 401 body equals the route handlers' 401 body", async () => {
    const proxy = unauthorizedResponse();
    const route = unauthorized();
    expect(proxy.status).toBe(401);
    expect(route.status).toBe(401);
    expect(await proxy.json()).toEqual(await route.json());
    expect(await unauthorizedResponse().json()).toEqual({ error: { code: "unauthorized", message: "Sign in required" } });
  });
});
