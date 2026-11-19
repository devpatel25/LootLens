import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePageUserId } from "@/lib/currentUser";

const nav = vi.hoisted(() => ({ redirect: vi.fn((to: string) => { throw new Error(`redirect:${to}`); }) }));
const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => nav);
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/auth", () => authMock);

beforeEach(() => {
  nav.redirect.mockClear();
  authMock.auth.mockReset();
});

describe("requirePageUserId", () => {
  it("returns the session user id", async () => {
    authMock.auth.mockResolvedValueOnce({ user: { id: "u1" } });
    await expect(requirePageUserId("/items/abc")).resolves.toBe("u1");
  });

  it("without a session goes to sign-in and keeps the page as the return address, like the proxy", async () => {
    authMock.auth.mockResolvedValueOnce(null);
    await expect(requirePageUserId("/items/abc")).rejects.toThrow("redirect:/signin?callbackUrl=%2Fitems%2Fabc");
  });
});
