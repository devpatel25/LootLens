import { describe, expect, it } from "vitest";
import { callbacks } from "@/lib/authConfig";

describe("session callback", () => {
  it("sets user.id from token.sub", () => {
    const out = callbacks.session({ session: { user: {} }, token: { sub: "u1" } } as never);
    expect(out).toMatchObject({ user: { id: "u1" } });
  });

  it("leaves user.id unset when sub is missing", () => {
    const out = callbacks.session({ session: { user: {} }, token: {} } as never);
    expect((out as { user: { id?: string } }).user.id).toBeUndefined();
  });
});
