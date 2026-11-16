import { describe, expect, it } from "vitest";
import { generateDemoListings } from "@/lib/demoListings";

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
