import { describe, expect, it } from "vitest";
import { generateDemoListings, resizeStock } from "@/lib/demoListings";

const stores = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
const names = ["Trail shoes", "Desk lamp", "Wool coat", "Headphones", "Hoodie", "a", "Mechanical keyboard", "Denim jacket"];
const base = { name: "Trail shoes", sizes: ["8", "9", "10"], selectedSize: "9", typicalPrice: 120 };

describe("generateDemoListings", () => {
  it("is deterministic for the same input", () => {
    expect(generateDemoListings(base, stores)).toEqual(generateDemoListings(base, stores));
  });

  it("differs between names", () => {
    expect(generateDemoListings(base, stores)).not.toEqual(generateDemoListings({ ...base, name: "Desk lamp" }, stores));
  });

  it.each(names)("follows every rule for %s", (name) => {
    const out = generateDemoListings({ ...base, name }, stores);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(new Set(out.map((l) => l.storeId)).size).toBe(out.length);
    for (const l of out) {
      expect(stores).toContain(l.storeId);
      expect(l.source).toBe("DEMO");
      const price = Number(l.price);
      expect(price).toBeGreaterThanOrEqual(120 * 0.75 - 0.005);
      expect(price).toBeLessThanOrEqual(120 * 1.25 + 0.005);
      expect(Math.round(price * 100)).toBeCloseTo(price * 100, 6);
      const stock = l.stockBySize as Record<string, number>;
      expect(Object.keys(stock).sort()).toEqual(["10", "8", "9"]);
      for (const q of Object.values(stock)) {
        expect(Number.isInteger(q) && q >= 0 && q <= 6).toBe(true);
      }
    }
    expect(out.filter((l) => l.condition !== "NEW").length).toBeLessThanOrEqual(1);
    expect(out.some((l) => (l.stockBySize as Record<string, number>)["9"] > 0)).toBe(true);
  });

  it("guarantees stock in the selected size over many names", () => {
    for (let i = 0; i < 200; i++) {
      const out = generateDemoListings({ ...base, name: `item ${i}` }, stores);
      expect(out.some((l) => (l.stockBySize as Record<string, number>)["9"] > 0)).toBe(true);
    }
  });

  it("uses all stores when fewer than 3 are given", () => {
    expect(generateDemoListings(base, ["s1", "s2"]).map((l) => l.storeId).sort()).toEqual(["s1", "s2"]);
  });
});

describe("resizeStock", () => {
  const ls = [
    { id: "l1", stockBySize: { S: 2, M: 0, L: 5 } },
    { id: "l2", stockBySize: { S: 0, M: 0, L: 0 } },
  ];
  const item = { name: "Denim jacket", sizes: ["M", "XL"], selectedSize: "XL" };

  it("drops removed sizes, keeps kept ones, adds new ones as 0 to 6", () => {
    const out = resizeStock(ls, item);
    expect(out).toHaveLength(2);
    for (const [i, s] of out.entries()) {
      expect(Object.keys(s).sort()).toEqual(["M", "XL"]);
      expect(s.M).toBe(ls[i].stockBySize.M);
      expect(Number.isInteger(s.XL) && s.XL >= 0 && s.XL <= 6).toBe(true);
    }
  });

  it("is deterministic and does not mutate its input", () => {
    const copy = structuredClone(ls);
    expect(resizeStock(ls, item)).toEqual(resizeStock(ls, item));
    expect(ls).toEqual(copy);
  });

  it("keeps existing values when the sizes are unchanged", () => {
    expect(resizeStock(ls, { name: "x", sizes: ["S", "M", "L"], selectedSize: "L" })).toEqual(ls.map((l) => l.stockBySize));
  });

  it("guarantees stock in the selected size somewhere", () => {
    for (let i = 0; i < 100; i++) {
      const out = resizeStock(ls, { name: `n${i}`, sizes: ["M", "XL"], selectedSize: "M" });
      expect(out.some((s) => s.M > 0)).toBe(true);
    }
  });

  it("handles no listings", () => {
    expect(resizeStock([], item)).toEqual([]);
  });
});
