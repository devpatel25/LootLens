import { describe, expect, it } from "vitest";
import { needsFictionalLabel, storeLabel } from "@/lib/storeLabel";

describe("fictional store labels", () => {
  it("relies on the fictional flag, not on any mention of the word", () => {
    expect(needsFictionalLabel({ name: "KickSwap", fictional: true })).toBe(true);
    expect(needsFictionalLabel({ name: "Nonfictional Books", fictional: true })).toBe(true);
    expect(needsFictionalLabel({ name: "Target", fictional: false })).toBe(false);
  });

  it("skips the extra label only when the name already ends with the seeded (fictional ...) note", () => {
    expect(needsFictionalLabel({ name: "KickSwap (fictional demo store)", fictional: true })).toBe(false);
    expect(storeLabel({ name: "KickSwap (fictional demo store)", fictional: true })).toBe("KickSwap (fictional demo store)");
  });

  it("adds (fictional) for prose and links when needed", () => {
    expect(storeLabel({ name: "KickSwap", fictional: true })).toBe("KickSwap (fictional)");
    expect(storeLabel({ name: "Nonfictional Books", fictional: true })).toBe("Nonfictional Books (fictional)");
    expect(storeLabel({ name: "Target", fictional: false })).toBe("Target");
  });
});
