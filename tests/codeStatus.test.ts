import { describe, expect, it } from "vitest";
import { CODES_ARE_DEMO, codeState } from "@/lib/codeStatus";
import { checkedAgo, endsIn } from "@/lib/format";

const now = new Date("2026-10-29T16:00:00.000Z");
const code = (over: Partial<{ status: "live" | "dead"; lastCheckedAt: string; expiresAt: string | null }>) => ({
  status: "live" as const,
  lastCheckedAt: "2026-10-29T13:00:00.000Z",
  expiresAt: null,
  ...over,
});

describe("codeState", () => {
  it("live when status is live, checked inside the window, and not expired", () => {
    expect(codeState(code({}), 24, now)).toBe("live");
  });

  it("dead wins over everything", () => {
    expect(codeState(code({ status: "dead", expiresAt: "2026-10-01T00:00:00.000Z" }), 24, now)).toBe("dead");
  });

  it("expired when the end date has passed, even if checked recently", () => {
    expect(codeState(code({ expiresAt: "2026-10-29T15:59:00.000Z" }), 24, now)).toBe("expired");
  });

  it("stale at exactly the window edge and beyond (fresh is strictly less than)", () => {
    expect(codeState(code({ lastCheckedAt: "2026-10-28T16:00:00.000Z" }), 24, now)).toBe("stale");
    expect(codeState(code({ lastCheckedAt: "2026-10-28T16:00:01.000Z" }), 24, now)).toBe("live");
    expect(codeState(code({ lastCheckedAt: "2026-10-28T10:00:00.000Z" }), 48, now)).toBe("live");
  });

  it("codes are demo data until a code source exists", () => {
    expect(CODES_ARE_DEMO).toBe(true);
  });
});

describe("checkedAgo", () => {
  it.each([
    ["2026-10-29T16:00:00.000Z", "checked just now"],
    ["2026-10-29T15:59:30.000Z", "checked just now"],
    ["2026-10-29T15:15:00.000Z", "checked 45m ago"],
    ["2026-10-29T13:00:00.000Z", "checked 3h ago"],
    ["2026-10-28T10:00:00.000Z", "checked 30h ago"],
    ["2026-10-26T16:00:00.000Z", "checked 3d ago"],
    ["2026-10-29T17:00:00.000Z", "checked just now"],
  ])("%s -> %s", (iso, text) => {
    expect(checkedAgo(iso, now)).toBe(text);
  });
});

describe("endsIn", () => {
  it.each([
    ["2026-11-30T00:00:00.000Z", "Ends in 31d"],
    ["2026-10-30T20:00:00.000Z", "Ends in 28h"],
    ["2026-10-29T16:30:00.000Z", "Ends in under an hour"],
  ])("%s -> %s (relative, so no timezone can shift the day)", (iso, text) => {
    expect(endsIn(iso, now)).toBe(text);
  });
});
