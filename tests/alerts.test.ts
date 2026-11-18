import { describe, expect, it } from "vitest";
import { alertKindForStock, evaluateWatch, targetNotBelow } from "@/lib/alerts";
import { demoSource } from "@/lib/demoSource";
import { currentSource } from "@/lib/refresh";
import type { Listing } from "@/lib/types";

const listing: Listing = {
  id: "l1", itemId: "i1", storeId: "s1", price: 92.5, condition: "new", url: "https://demo.example/x",
  stockBySize: { "8": 1, "9": 2, "10": 0 }, updatedAt: "2026-10-29T16:00:00.000Z", source: "demo",
};

describe("demoSource", () => {
  it("cuts price by 10% to the cent and takes one unit from each size, floor 0", () => {
    expect(demoSource([listing])).toEqual([{ listingId: "l1", price: 83.25, stockBySize: { "8": 0, "9": 1, "10": 0 } }]);
  });
});

describe("demoSource sources", () => {
  it("leaves live listings alone", () => {
    expect(demoSource([{ ...listing, source: "live" }])).toEqual([]);
  });
});

describe("currentSource", () => {
  it("reports each listing's price and stock unchanged", () => {
    expect(currentSource([listing])).toEqual([{ listingId: "l1", price: 92.5, stockBySize: { "8": 1, "9": 2, "10": 0 } }]);
  });
});

describe("evaluateWatch", () => {
  const w = (targetPrice: number | null) => ({ targetPrice, baselinePrice: 100, lowStockAt: 3 });
  it.each([
    [79.99, true],
    [80, true],
    [80.01, false],
  ])("target 80, price %s -> %s", (price, met) => {
    expect(evaluateWatch(w(80), { price, stock: 10 }).priceCondMet).toBe(met);
  });

  it.each([
    [99, true],
    [100, false],
  ])("any drop from baseline 100, price %s -> %s", (price, met) => {
    expect(evaluateWatch(w(null), { price, stock: 10 }).priceCondMet).toBe(met);
  });

  it("null price is not met", () => {
    expect(evaluateWatch(w(80), { price: null, stock: 10 }).priceCondMet).toBe(false);
    expect(evaluateWatch(w(null), { price: null, stock: 10 }).priceCondMet).toBe(false);
  });

  it.each([
    [3, true],
    [4, false],
    [0, true],
  ])("lowStockAt 3, stock %s -> %s", (stock, met) => {
    expect(evaluateWatch(w(80), { price: 90, stock }).stockCondMet).toBe(met);
  });
});

describe("alertKindForStock", () => {
  it("zero is out_of_stock, above zero is low_size", () => {
    expect(alertKindForStock(0)).toBe("out_of_stock");
    expect(alertKindForStock(2)).toBe("low_size");
  });
});

describe("targetNotBelow", () => {
  // One rule for the watch form and POST /api/watches: a target must be below today's cheapest price.
  it.each([
    [60, 60, true],
    [70, 60, true],
    [59.99, 60, false],
    [null, 60, false],
    [undefined, 60, false],
  ])("target %s with a price of %s -> %s", (target, price, want) => {
    expect(targetNotBelow(target, price)).toBe(want);
  });
});
