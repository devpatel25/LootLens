import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGNIN, keepSignInPage, reauthUrl, safeCallbackUrl, signInErrorCode, signInErrorMessage, signInUrl } from "@/lib/signin";

describe("safeCallbackUrl", () => {
  it("keeps a same-site path with its query", () => {
    expect(safeCallbackUrl("/items/abc?tab=codes")).toBe("/items/abc?tab=codes");
  });

  it("falls back to the wishlist when missing or empty", () => {
    expect(DEFAULT_AFTER_SIGNIN).toBe("/wishlist");
    expect(safeCallbackUrl(undefined)).toBe("/wishlist");
    expect(safeCallbackUrl("")).toBe("/wishlist");
  });

  it("keeps a destination whose query has a bare % or an encoded backslash", () => {
    expect(safeCallbackUrl("/codes?q=100%")).toBe("/codes?q=100%");
    expect(safeCallbackUrl("/items/x?q=a%5Cb")).toBe("/items/x?q=a%5Cb");
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

  it.each(["/%61pi/items", "/%61%70%69", "/%73ignin", "/sign%69n?callbackUrl=%2Fcodes"])(
    "checks the decoded path, so the encoded %s is still refused",
    (raw) => expect(safeCallbackUrl(raw)).toBe("/wishlist"),
  );
});

describe("signInUrl", () => {
  it("keeps the destination", () => {
    expect(signInUrl("/items/1", "?size=9")).toBe("/signin?callbackUrl=%2Fitems%2F1%3Fsize%3D9");
  });
  it("works without a query", () => {
    expect(signInUrl("/wishlist", "")).toBe("/signin?callbackUrl=%2Fwishlist");
  });
});

describe("reauthUrl", () => {
  it("asks to sign in again and keeps the return address", () => {
    expect(reauthUrl("/items/1", "?size=9")).toBe("/signin?callbackUrl=%2Fitems%2F1%3Fsize%3D9&reauth=1");
    expect(keepSignInPage(new URL(reauthUrl("/codes", ""), "http://x").searchParams)).toBe(true);
  });
});

describe("keepSignInPage", () => {
  it("shows the page to a signed-in visit that carries an error, so the message is seen", () => {
    expect(keepSignInPage(new URLSearchParams("error=OAuthCallbackError"))).toBe(true);
  });
  it("shows the page when the visit asks to sign in again (a session whose user was removed)", () => {
    expect(keepSignInPage(new URLSearchParams("reauth=1&callbackUrl=%2Fcodes"))).toBe(true);
  });
  it("sends an ordinary signed-in visit on", () => {
    expect(keepSignInPage(new URLSearchParams("callbackUrl=%2Fcodes"))).toBe(false);
    expect(keepSignInPage(new URLSearchParams(""))).toBe(false);
  });
});

describe("signInErrorCode", () => {
  it.each(["AccessDenied", "OAuthCallbackError", "MissingCSRF", "Configuration"])("passes the known code %s through", (type) => {
    expect(signInErrorCode(type)).toBe(type);
  });
  it.each(["MissingSecret", "InvalidProvider", "AuthError", "__proto__"])("reports %s as Configuration, without its details", (type) => {
    expect(signInErrorCode(type)).toBe("Configuration");
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

  // Auth.js also reports an expired or replayed sign-in (a missing state cookie) as Configuration, and trying
  // again fixes that, so the message must not say "try later" only.
  it("explains a server-side failure without leaking details, and says trying again can work", () => {
    expect(signInErrorMessage("Configuration")).toBe("Sign-in could not finish on the server. Try again. If it keeps failing, try again later.");
  });

  it.each(["__proto__", "constructor", "toString", "hasOwnProperty"])("treats the object key %s as an unknown code", (code) => {
    expect(signInErrorMessage(code)).toBe("Sign-in did not finish. Try again.");
  });

  it("explains a sign-in cancelled at Google (Auth.js reports it as OAuthCallbackError)", () => {
    expect(signInErrorMessage("OAuthCallbackError")).toBe("Google sign-in was cancelled or did not finish. Try again.");
  });

  it("explains an expired sign-in form", () => {
    expect(signInErrorMessage("MissingCSRF")).toBe("The sign-in page expired. Try again.");
  });

  it("gives a generic message for any other code", () => {
    expect(signInErrorMessage("Verification")).toBe("Sign-in did not finish. Try again.");
    expect(signInErrorMessage(["AccessDenied", "x"])).toBe("Google sign-in was cancelled or denied. Try again.");
  });
});
