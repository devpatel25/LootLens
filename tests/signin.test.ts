import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGNIN, safeCallbackUrl, signInErrorMessage } from "@/lib/signin";

describe("safeCallbackUrl", () => {
  it("keeps a same-site path with its query", () => {
    expect(safeCallbackUrl("/items/abc?tab=codes")).toBe("/items/abc?tab=codes");
  });

  it("falls back to the wishlist when missing or empty", () => {
    expect(DEFAULT_AFTER_SIGNIN).toBe("/wishlist");
    expect(safeCallbackUrl(undefined)).toBe("/wishlist");
    expect(safeCallbackUrl("")).toBe("/wishlist");
  });

  it("uses the first value when the param repeats", () => {
    expect(safeCallbackUrl(["/codes", "https://evil.example"])).toBe("/codes");
  });

  it.each([
    "https://evil.example/wishlist",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "wishlist",
    "/%2F%2Fevil.example",
  ])("rejects an off-site or odd value: %s", (raw) => {
    expect(safeCallbackUrl(raw)).toBe("/wishlist");
  });

  it("never sends a page visit to a raw API route", () => {
    expect(safeCallbackUrl("/api/items")).toBe("/wishlist");
    expect(safeCallbackUrl("/api")).toBe("/wishlist");
    expect(safeCallbackUrl("/api-docs")).toBe("/api-docs");
  });

  it("never sends the user back to the sign-in page", () => {
    expect(safeCallbackUrl("/signin")).toBe("/wishlist");
    expect(safeCallbackUrl("/signin?callbackUrl=%2Fcodes")).toBe("/wishlist");
  });
});

describe("signInErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(signInErrorMessage(undefined)).toBeNull();
    expect(signInErrorMessage("")).toBeNull();
  });

  it("explains a cancelled or denied Google sign-in", () => {
    expect(signInErrorMessage("AccessDenied")).toBe("Google sign-in was cancelled or denied. Try again.");
  });

  it("explains a server setup problem without leaking details", () => {
    expect(signInErrorMessage("Configuration")).toBe("Sign-in is not set up correctly on the server. Try again later.");
  });

  it.each(["__proto__", "constructor", "toString", "hasOwnProperty"])("treats the object key %s as an unknown code", (code) => {
    expect(signInErrorMessage(code)).toBe("Sign-in did not finish. Try again.");
  });

  it("gives a generic message for any other code", () => {
    expect(signInErrorMessage("OAuthCallbackError")).toBe("Sign-in did not finish. Try again.");
    expect(signInErrorMessage(["AccessDenied", "x"])).toBe("Google sign-in was cancelled or denied. Try again.");
  });
});
