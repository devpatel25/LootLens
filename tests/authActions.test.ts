import { AuthError } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInWithGoogle, signOutAction } from "@/lib/authActions";

const auth = vi.hoisted(() => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/auth", () => auth);
const nav = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect ${url}`);
  }),
}));
vi.mock("next/navigation", () => nav);

// Auth.js error classes read their code from a static `type`, like the real ones.
class MissingSecret extends AuthError {
  static type = "MissingSecret";
}
class AccessDenied extends AuthError {
  static type = "AccessDenied";
}

const form = (callbackUrl?: string) => {
  const f = new FormData();
  if (callbackUrl !== undefined) f.set("callbackUrl", callbackUrl);
  return f;
};

beforeEach(() => {
  auth.signIn.mockReset();
  auth.signOut.mockReset();
  nav.redirect.mockClear();
});

describe("signInWithGoogle", () => {
  it("starts Google sign-in and returns to a same-site path", async () => {
    await signInWithGoogle(form("/items/abc"));
    expect(auth.signIn).toHaveBeenCalledWith("google", { redirectTo: "/items/abc" });
  });

  it("re-checks callbackUrl on the server, since the hidden field can be edited", async () => {
    await signInWithGoogle(form("https://evil.example"));
    expect(auth.signIn).toHaveBeenCalledWith("google", { redirectTo: "/wishlist" });
  });

  it("falls back to the wishlist when the field is missing", async () => {
    await signInWithGoogle(form());
    expect(auth.signIn).toHaveBeenCalledWith("google", { redirectTo: "/wishlist" });
  });

  it("returns to the sign-in page with a message when Auth.js fails (for example a missing secret)", async () => {
    auth.signIn.mockRejectedValue(new MissingSecret("no secret"));
    await expect(signInWithGoogle(form("/items/abc"))).rejects.toThrow("redirect /signin?error=Configuration&callbackUrl=%2Fitems%2Fabc");
  });

  it("keeps a client-safe error code", async () => {
    auth.signIn.mockRejectedValue(new AccessDenied("denied"));
    await expect(signInWithGoogle(form())).rejects.toThrow("redirect /signin?error=AccessDenied&callbackUrl=%2Fwishlist");
  });

  it("lets anything else through, such as the redirect to Google itself", async () => {
    const toGoogle = new Error("NEXT_REDIRECT");
    auth.signIn.mockRejectedValue(toGoogle);
    await expect(signInWithGoogle(form())).rejects.toBe(toGoogle);
    expect(nav.redirect).not.toHaveBeenCalled();
  });
});

describe("signOutAction", () => {
  it("signs out and lands on the sign-in page", async () => {
    await signOutAction();
    expect(auth.signOut).toHaveBeenCalledWith({ redirectTo: "/signin" });
  });
});
