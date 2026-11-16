import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInWithGoogle, signOutAction } from "@/lib/authActions";

const auth = vi.hoisted(() => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

const form = (callbackUrl?: string) => {
  const f = new FormData();
  if (callbackUrl !== undefined) f.set("callbackUrl", callbackUrl);
  return f;
};

beforeEach(() => {
  auth.signIn.mockReset();
  auth.signOut.mockReset();
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
});

describe("signOutAction", () => {
  it("signs out and lands on the sign-in page", async () => {
    await signOutAction();
    expect(auth.signOut).toHaveBeenCalledWith({ redirectTo: "/signin" });
  });
});
