import { describe, expect, it } from "vitest";
import {
  compareListings,
  formatPrice,
  loadComparisonData,
  resolveSize,
  type ComparisonData,
} from "@/lib/comparison";

const data = loadComparisonData();
const storeOrder = (size: string) =>
  compareListings(data, size).rows.map((r) => `${r.store.id}:${r.inStock ? "in" : "out"}`);

describe("compareListings", () => {
  it("lists in-stock listings cheapest first, then out-of-stock ones", () => {
    expect(storeOrder("9")).toEqual([
      "store-fbm:in",
      "store-walmart:in",
      "store-adidas:in",
      "store-kickswap:in",
      "store-amazon:out",
    ]);
  });

  it("reflects stock for the chosen size", () => {
    expect(storeOrder("10")).toEqual([
      "store-amazon:in",
      "store-walmart:in",
      "store-kickswap:in",
      "store-fbm:out",
      "store-adidas:out",
    ]);
  });

  it("separates the lowest overall price from the lowest new price", () => {
    const result = compareListings(data, "9");
    expect(result.lowest?.store.id).toBe("store-fbm");
    expect(result.lowest?.listing.condition).toBe("used");
    expect(result.lowestNew?.store.id).toBe("store-walmart");
  });

  it("computes savings against the typical price without float drift", () => {
    const rows = compareListings(data, "9").rows;
    const byStore = Object.fromEntries(rows.map((r) => [r.store.id, r]));
    expect(byStore["store-amazon"].savings).toBe(15.01);
    expect(byStore["store-amazon"].savingsPercent).toBe(15);
    expect(byStore["store-walmart"].savings).toBe(7.5);
    expect(byStore["store-adidas"].savings).toBe(0);
    expect(byStore["store-kickswap"].savings).toBe(-18);
    expect(byStore["store-kickswap"].savingsPercent).toBe(-18);
  });

  it("returns no best price when nothing is in stock", () => {
    const soldOut: ComparisonData = {
      ...data,
      listings: data.listings.map((l) => ({ ...l, stockBySize: {} })),
    };
    const result = compareListings(soldOut, "9");
    expect(result.rows.every((r) => !r.inStock && r.stock === 0)).toBe(true);
    expect(result.lowest).toBeNull();
    expect(result.lowestNew).toBeNull();
  });

  it("ignores listings for other items", () => {
    const withOther: ComparisonData = {
      ...data,
      listings: [...data.listings, { ...data.listings[0], id: "x", itemId: "other", price: 1 }],
    };
    expect(compareListings(withOther, "9").rows).toHaveLength(data.listings.length);
  });

  it("rejects a size the item isn't offered in", () => {
    expect(() => compareListings(data, "13")).toThrow(/not offered/);
  });

  it("rejects listings that point at an unknown store", () => {
    const broken: ComparisonData = { ...data, stores: data.stores.slice(1) };
    expect(() => compareListings(broken, "9")).toThrow(/unknown store store-adidas/);
  });
});

describe("resolveSize", () => {
  it("keeps an offered size and falls back to the default otherwise", () => {
    expect(resolveSize(data.item, "10")).toBe("10");
    expect(resolveSize(data.item, "13")).toBe("9");
    expect(resolveSize(data.item, undefined)).toBe("9");
  });
});

describe("formatPrice", () => {
  it("formats dollars as USD", () => {
    expect(formatPrice(84.99)).toBe("$84.99");
    expect(formatPrice(60)).toBe("$60.00");
  });
});
