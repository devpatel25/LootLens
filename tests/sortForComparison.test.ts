import { describe, expect, it } from "vitest";
import fixture from "@/fixtures/comparison.json";
import { cheapestListing, sortForComparison } from "@/lib/pricing";
import type { ItemComparison, Listing } from "@/lib/types";

const demo = () => structuredClone(fixture) as ItemComparison;
const at = (c: ItemComparison, id: string, patch: Partial<Listing>) => {
  c.listings = c.listings.map((l) => (l.id === id ? { ...l, ...patch } : l));
};

describe("sortForComparison", () => {
  it("orders by price, lowest first, without changing the input", () => {
    const c = demo();
    const before = c.listings.map((l) => l.id);
    expect(sortForComparison(c.listings, c.stores).map((l) => l.price)).toEqual([60, 84.99, 92.5, 100, 118]);
    expect(c.listings.map((l) => l.id)).toEqual(before);
  });

  it("on a price tie puts new condition first (Story 3)", () => {
    const c = demo();
    at(c, "lst-walmart", { price: 60 });
    expect(sortForComparison(c.listings, c.stores).slice(0, 2).map((l) => l.id)).toEqual(["lst-walmart", "lst-fbm"]);
  });

  it("then store name A to Z", () => {
    const c = demo();
    at(c, "lst-walmart", { price: 84.99 });
    expect(sortForComparison(c.listings, c.stores).slice(1, 3).map((l) => l.id)).toEqual(["lst-amazon", "lst-walmart"]);
  });

  it("puts the cheapest in-stock listing first among same-price in-stock rows", () => {
    const c = demo();
    at(c, "lst-walmart", { price: 60 });
    const size = c.item.selectedSize;
    const cheapest = cheapestListing(c.listings, c.stores, size)!;
    const firstInStock = sortForComparison(c.listings, c.stores).find((l) => (l.stockBySize[size] ?? 0) > 0)!;
    expect(firstInStock.id).toBe(cheapest.id);
  });
});
