import { describe, expect, it } from "vitest";
import comparisonFixture from "@/fixtures/comparison.json";
import lowTrustFixture from "@/fixtures/comparison-lowtrust.json";
import { pickBestDeal, trustedListings } from "@/lib/pricing";
import type { ItemComparison } from "@/lib/types";

const fixtures = [comparisonFixture, lowTrustFixture].map((f) => structuredClone(f) as ItemComparison);

describe("trustedListings", () => {
  it("keeps listings whose store exists and is not low-trust", () => {
    const c = structuredClone(lowTrustFixture) as ItemComparison;
    c.listings.push({ ...c.listings[0], id: "lst-unknown", storeId: "store-missing" });
    const ids = trustedListings(c.listings, c.stores).map((l) => l.storeId);
    expect(ids).not.toContain("store-kickswap");
    expect(ids).not.toContain("store-missing");
    expect(ids).toContain("store-adidas");
  });
});

describe("pickBestDeal", () => {
  it.each(fixtures.map((c, i) => [i, c] as const))("picks the same deal the API returned (fixture %i)", (_i, c) => {
    expect(pickBestDeal(c.bestDeals, c.listings, c.stores, c.item.selectedSize)).toEqual(c.bestDeal);
  });

  it("picks the best trusted deal from the trusted listings", () => {
    const c = structuredClone(lowTrustFixture) as ItemComparison;
    expect(pickBestDeal(c.bestDeals, trustedListings(c.listings, c.stores), c.stores, c.item.selectedSize)).toEqual(c.bestTrustedDeal);
  });

  it("skips listings out of stock in the size, and returns null when none is left", () => {
    const c = structuredClone(comparisonFixture) as ItemComparison;
    c.listings = c.listings.map((l) => ({ ...l, stockBySize: {} }));
    expect(pickBestDeal(c.bestDeals, c.listings, c.stores, c.item.selectedSize)).toBeNull();
  });
});
