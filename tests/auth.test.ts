import { describe, expect, it } from "vitest";
import { callbacks } from "@/lib/authConfig";

describe("auth callbacks", () => {
  it("jwt copies user.id onto the token", () => {
    const out = callbacks.jwt({ token: {}, user: { id: "u1" } } as never);
    expect(out).toMatchObject({ id: "u1" });
  });

  it("jwt keeps token.id when user is absent", () => {
    const out = callbacks.jwt({ token: { id: "u1" } } as never);
    expect(out).toMatchObject({ id: "u1" });
  });

  it("session sets user.id from the token", () => {
    const out = callbacks.session({ session: { user: {} }, token: { id: "u1" } } as never);
    expect(out).toMatchObject({ user: { id: "u1" } });
  });
});
