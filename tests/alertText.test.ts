import { describe, expect, it } from "vitest";
import { alertText, watchSummary } from "@/lib/alertText";
import { ago } from "@/lib/format";

describe("alertText", () => {
  it("describes each kind in plain words", () => {
    expect(alertText({ kind: "price_drop", detail: { from: 84.99, to: 60 } })).toBe("Price dropped from $84.99 to $60.00");
    expect(alertText({ kind: "low_size", detail: { qty: 1 } })).toBe("Only 1 left in your size");
    expect(alertText({ kind: "low_size", detail: { qty: 3 } })).toBe("Only 3 left in your size");
    expect(alertText({ kind: "out_of_stock", detail: { qty: 0 } })).toBe("Out of stock in your size");
  });
});

describe("watchSummary", () => {
  const base = { size: "M", targetPrice: null, baselinePrice: 79.99, lowStockAt: 3 };
  it("any drop", () => {
    expect(watchSummary(base)).toBe("Size M: any price drop below $79.99, and when 3 or fewer are left.");
  });
  it("target price", () => {
    expect(watchSummary({ ...base, targetPrice: 70 })).toBe("Size M: when the price is $70.00 or less, and when 3 or fewer are left.");
  });
  it("low stock 0 means sold out, 1 is singular", () => {
    expect(watchSummary({ ...base, lowStockAt: 0 })).toBe("Size M: any price drop below $79.99, and when it sells out.");
    expect(watchSummary({ ...base, lowStockAt: 1 })).toBe("Size M: any price drop below $79.99, and when 1 or fewer is left.");
  });
});

describe("ago", () => {
  const now = new Date("2026-10-29T16:00:00.000Z");
  it("is the shared relative time used by checkedAgo", () => {
    expect(ago("2026-10-29T13:00:00.000Z", now)).toBe("3h ago");
    expect(ago("2026-10-29T16:00:00.000Z", now)).toBe("just now");
  });
});
