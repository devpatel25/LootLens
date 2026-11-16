import { describe, expect, it } from "vitest";
import { bestDealAddsUp } from "@/lib/pricing";

describe("bestDealAddsUp", () => {
  it("true when the rounded lines add up to the rounded total", () => {
    expect(bestDealAddsUp({ listingId: "l", price: 60, code: null, cashback: null, total: 60 })).toBe(true);
    expect(bestDealAddsUp({ listingId: "l", price: 94.99, code: { id: "c", code: "TGT50", discount: 50 }, cashback: null, total: 44.99 })).toBe(true);
  });

  it("false when rounding each line leaves a one-cent gap", () => {
    // 92.50 - 9.25 - 1.67 = 81.58, but the total 81.585 rounds to 81.59.
    expect(
      bestDealAddsUp({
        listingId: "l", price: 92.5, code: { id: "c", code: "SAVE10", discount: 9.25 },
        cashback: { provider: "DemoCash", ratePct: 2, amount: 1.665 }, total: 81.585,
      }),
    ).toBe(false);
  });
});
