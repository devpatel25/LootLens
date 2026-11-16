import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiFetch, friendlyMessage } from "@/lib/apiClient";

const respond = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })));

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns data on success", async () => {
    respond(200, { data: { id: "x" } });
    await expect(apiFetch("/api/items/x")).resolves.toEqual({ id: "x" });
  });

  it("sends JSON with the method", async () => {
    respond(201, { data: { id: "n" } });
    await apiFetch("/api/items", { method: "POST", json: { name: "A" } });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/items");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ name: "A" }));
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
  });

  it("throws ApiClientError with the server's code, message, and retry time", async () => {
    respond(429, { error: { code: "rate_limited", message: "Slow down", retryAfterSeconds: 30 } });
    const err = await apiFetch("/api/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ status: 429, code: "rate_limited", message: "Slow down", retryAfterSeconds: 30 });
  });

  it("copes with a body that is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { status: 502 })));
    const err = await apiFetch("/api/x").catch((e) => e);
    expect(err).toMatchObject({ status: 502, code: "unknown" });
  });
});

describe("friendlyMessage", () => {
  it("never shows the server's raw text for 4xx errors", () => {
    expect(friendlyMessage(new ApiClientError("name: Too big", 400, "bad_request"))).toBe(
      "Some details were not accepted. Check the form and try again.",
    );
    expect(friendlyMessage(new ApiClientError("Item not found", 404, "not_found"))).toBe("It was not found. It may have been deleted.");
    expect(friendlyMessage(new ApiClientError("x", 409, "conflict"))).toBe("This changed somewhere else. Reload and try again.");
  });

  it("explains an ended session", () => {
    expect(friendlyMessage(new ApiClientError("Sign in required", 401, "unauthorized"))).toBe("Your session ended. Sign in again.");
  });

  it("gives the wait time when rate limited", () => {
    expect(friendlyMessage(new ApiClientError("x", 429, "rate_limited", 30))).toBe("Too many requests. Try again in 30 seconds.");
    expect(friendlyMessage(new ApiClientError("x", 429, "rate_limited"))).toBe("Too many requests. Try again in a moment.");
  });

  it("hides server and network details", () => {
    expect(friendlyMessage(new ApiClientError("stack trace", 500, "internal"))).toBe("Something went wrong. Try again.");
    expect(friendlyMessage(new TypeError("Failed to fetch"))).toBe("Could not reach LootLens. Check your connection and try again.");
  });
});
