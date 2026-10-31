import { describe, expect, it } from "vitest";
import { cheapestListing, sortByPrice, stockInSize } from "@/lib/pricing";
import type { Listing } from "@/lib/types";

function listing(overrides: Partial<Listing>): Listing {
  return {
    id: "lst",
    itemId: "item-1",
    storeId: "store-1",
    price: 100,
    condition: "new",
    url: "https://example.com/demo",
    stockBySize: { "9": 1 },
    updatedAt: "2026-10-29T12:00:00Z",
    source: "demo",
    ...overrides,
  };
}

describe("stockInSize", () => {
  it("returns the units for the size", () => {
    expect(stockInSize(listing({ stockBySize: { "9": 4 } }), "9")).toBe(4);
  });

  it("treats a missing size as zero", () => {
    expect(stockInSize(listing({ stockBySize: { "8": 4 } }), "9")).toBe(0);
  });
});

describe("cheapestListing", () => {
  it("picks the lowest price in stock for the size", () => {
    const a = listing({ id: "a", price: 100 });
    const b = listing({ id: "b", price: 90 });
    expect(cheapestListing([a, b], "9")?.id).toBe("b");
  });

  it("skips a cheaper listing that is out of stock in the size", () => {
    const outOfStock = listing({ id: "oos", price: 50, stockBySize: { "9": 0, "10": 3 } });
    const inStock = listing({ id: "in", price: 80 });
    expect(cheapestListing([outOfStock, inStock], "9")?.id).toBe("in");
  });

  it("skips a listing with no entry for the size", () => {
    const noSize = listing({ id: "none", price: 50, stockBySize: { "10": 3 } });
    const inStock = listing({ id: "in", price: 80 });
    expect(cheapestListing([noSize, inStock], "9")?.id).toBe("in");
  });

  it("includes used and resale listings", () => {
    const used = listing({ id: "used", price: 60, condition: "used" });
    const fresh = listing({ id: "new", price: 90 });
    expect(cheapestListing([fresh, used], "9")?.id).toBe("used");
  });

  it("prefers the new listing on a price tie", () => {
    const resale = listing({ id: "resale", price: 70, condition: "resale" });
    const fresh = listing({ id: "new", price: 70 });
    expect(cheapestListing([resale, fresh], "9")?.id).toBe("new");
  });

  it("keeps input order on a tie with the same condition", () => {
    const first = listing({ id: "first", price: 70 });
    const second = listing({ id: "second", price: 70 });
    expect(cheapestListing([first, second], "9")?.id).toBe("first");
  });

  it("returns null when nothing is in stock in the size", () => {
    const a = listing({ stockBySize: { "9": 0 } });
    expect(cheapestListing([a], "9")).toBeNull();
  });

  it("returns null for no listings", () => {
    expect(cheapestListing([], "9")).toBeNull();
  });
});

describe("sortByPrice", () => {
  it("orders by price ascending without mutating the input", () => {
    const input = [
      listing({ id: "c", price: 30 }),
      listing({ id: "a", price: 10 }),
      listing({ id: "b", price: 20 }),
    ];
    expect(sortByPrice(input).map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(input.map((l) => l.id)).toEqual(["c", "a", "b"]);
  });
});
