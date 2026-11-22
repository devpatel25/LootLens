import { describe, expect, it } from "vitest";
import { errorResponse } from "@/lib/apiError";

describe("apiError", () => {
  it("builds the error body with extra fields and headers", async () => {
    const res = errorResponse(429, "rate_limited", "Slow down", { retryAfterSeconds: 3 }, { "Retry-After": "3" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3");
    expect(await res.json()).toEqual({ error: { code: "rate_limited", message: "Slow down", retryAfterSeconds: 3 } });
  });
});
