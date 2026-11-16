import { describe, expect, it } from "vitest";
import comparisonJson from "@/fixtures/comparison.json";
import codesJson from "@/fixtures/codes.json";
import codesAllJson from "@/fixtures/codes-all.json";
import settingsJson from "@/fixtures/settings.json";
import {
  bestCashback,
  bestDeal,
  bestTotal,
  cheapestListing,
  cheapestTrustedListing,
  isExpired,
  isFresh,
  stockInSize,
  trustFlags,
} from "@/lib/pricing";
import type { Code, ItemComparison, Listing, Settings, Store } from "@/lib/types";

const cmp = comparisonJson as unknown as ItemComparison;
const codesAll = codesAllJson as unknown as Code[];
const codesDefault = codesJson as unknown as Code[];
const fixtureSettings = settingsJson as unknown as Settings;
const NOW = new Date("2026-10-29T16:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const store = (id: string, over: Partial<Store> = {}): Store => ({
  id,
  name: id,
  domain: `${id}.test`,
  sellerName: id,
  isHttps: true,
  photoReviewCount: 100,
  rating: 4.5,
  fictional: false,
  cashback: [],
  trust: { lowTrust: false, reasons: [] },
  ...over,
});
const listing = (id: string, storeId: string, price: number, over: Partial<Listing> = {}): Listing => ({
  id,
  itemId: "i",
  storeId,
  price,
  condition: "new",
  url: "https://x.test",
  stockBySize: { "9": 3 },
  updatedAt: NOW.toISOString(),
  source: "demo",
  ...over,
});
const code = (over: Partial<Code> = {}): Code => ({
  id: "c1",
  storeId: "s1",
  storeName: "s1",
  code: "SAVE",
  label: "",
  type: "pct",
  value: 20,
  minSpend: null,
  firstOrderOnly: false,
  expiresAt: null,
  status: "live",
  lastCheckedAt: hoursAgo(1),
  cashback: null,
  ...over,
});
const settings: Settings = { freshnessHours: 24, firstOrderEligible: false };

describe("stockInSize", () => {
  it("returns stock, and 0 for a missing size", () => {
    const l = listing("a", "s1", 10, { stockBySize: { "9": 4 } });
    expect(stockInSize(l, "9")).toBe(4);
    expect(stockInSize(l, "10")).toBe(0);
  });
});

describe("cheapestListing", () => {
  const stores = [store("s1", { name: "Beta" }), store("s2", { name: "Alpha" })];
  it("skips listings out of stock in the size", () => {
    const l = [listing("a", "s1", 50, { stockBySize: { "9": 0 } }), listing("b", "s2", 60)];
    expect(cheapestListing(l, stores, "9")?.id).toBe("b");
  });
  it("returns null when nothing is in stock, without throwing", () => {
    expect(cheapestListing([listing("a", "s1", 50)], stores, "11")).toBeNull();
    expect(cheapestListing([], stores, "9")).toBeNull();
  });
  it("lets a new listing beat a used one on a tie", () => {
    const l = [listing("u", "s2", 50, { condition: "used" }), listing("n", "s1", 50)];
    expect(cheapestListing(l, stores, "9")?.id).toBe("n");
  });
  it("breaks a two-new tie by store name A to Z", () => {
    const l = [listing("b", "s1", 50), listing("a", "s2", 50)];
    expect(cheapestListing(l, stores, "9")?.id).toBe("a");
  });
  it("picks a used listing when it is cheapest", () => {
    const l = [listing("n", "s1", 60), listing("u", "s2", 40, { condition: "used" })];
    expect(cheapestListing(l, stores, "9")?.id).toBe("u");
  });
  it("keeps a listing whose store is missing", () => {
    expect(cheapestListing([listing("a", "ghost", 10)], stores, "9")?.id).toBe("a");
  });
  it("fixture Samba size 9: Amazon is out of stock, fbm wins", () => {
    const r = cheapestListing(cmp.listings, cmp.stores, "9");
    expect(r?.storeId).not.toBe("store-amazon");
    expect(r?.id).toBe("lst-fbm");
  });
});

describe("isFresh", () => {
  it("is fresh under the window, stale at it, stale when dead", () => {
    expect(isFresh({ status: "live", lastCheckedAt: hoursAgo(23) }, 24, NOW)).toBe(true);
    expect(isFresh({ status: "live", lastCheckedAt: hoursAgo(24) }, 24, NOW)).toBe(false);
    expect(isFresh({ status: "dead", lastCheckedAt: hoursAgo(1) }, 24, NOW)).toBe(false);
  });
});

describe("isExpired", () => {
  it("expires at the boundary, never when null", () => {
    expect(isExpired({ expiresAt: NOW.toISOString() }, NOW)).toBe(true);
    expect(isExpired({ expiresAt: new Date(NOW.getTime() + 1).toISOString() }, NOW)).toBe(false);
    expect(isExpired({ expiresAt: null }, NOW)).toBe(false);
  });
});

describe("trustFlags", () => {
  it("flags all three reasons in order", () => {
    const s = store("k", { isHttps: false, photoReviewCount: 5, rating: 3 });
    expect(trustFlags(s)).toEqual({
      lowTrust: true,
      reasons: ["no_https", "few_photo_reviews", "low_rating"],
    });
  });
  it("passes at the thresholds", () => {
    expect(trustFlags(store("k", { photoReviewCount: 20, rating: 3.5 }))).toEqual({
      lowTrust: false,
      reasons: [],
    });
  });
  it("flags KickSwap in the fixture", () => {
    const k = cmp.stores.find((s) => s.name.startsWith("KickSwap"))!;
    expect(trustFlags(k)).toEqual({
      lowTrust: true,
      reasons: ["no_https", "few_photo_reviews", "low_rating"],
    });
  });
});

describe("bestTotal", () => {
  const s = store("s1", { cashback: [{ provider: "A", ratePct: 5 }] });
  const l = listing("l", "s1", 100);
  const total = (codes: Code[], st = s, cfg = settings) => bestTotal(l, st, codes, cfg, NOW);

  it("applies a 20% code then 5% cashback on the post-code price", () => {
    const r = total([code()]);
    expect(r.code).toEqual({ id: "c1", code: "SAVE", discount: 20 });
    expect(r.cashback?.amount).toBeCloseTo(4, 6);
    expect(r.total).toBeCloseTo(76, 6);
  });
  it("ignores a code when min spend is not met", () => {
    expect(total([code({ minSpend: 150 })]).code).toBeNull();
  });
  it("handles first-order codes by the toggle", () => {
    const c = code({ firstOrderOnly: true });
    expect(total([c]).code).toBeNull();
    expect(total([c], s, { ...settings, firstOrderEligible: true }).code?.id).toBe("c1");
  });
  it("ignores dead, stale, and expired codes", () => {
    expect(total([code({ status: "dead" })]).code).toBeNull();
    expect(total([code({ lastCheckedAt: hoursAgo(24) })]).code).toBeNull();
    expect(total([code({ expiresAt: hoursAgo(1) })]).code).toBeNull();
  });
  it("caps a flat code at the price, total never negative", () => {
    const r = bestTotal(listing("l", "s1", 30), store("s1"), [code({ type: "flat", value: 50 })], settings, NOW);
    expect(r.code?.discount).toBe(30);
    expect(r.total).toBeCloseTo(0, 6);
  });
  it("ignores another store's code", () => {
    expect(total([code({ storeId: "other" })]).code).toBeNull();
  });
  it("picks the biggest discount, first on tie", () => {
    const r = total([
      code({ id: "a", value: 10 }),
      code({ id: "b", type: "flat", value: 30 }),
      code({ id: "c", value: 30 }),
    ]);
    expect(r.code?.id).toBe("b");
  });
  it("treats discounts equal to the cent as a tie, first wins", () => {
    // 90% of 0.70 is 0.6299999999999999 in floats, the flat code is 0.63.
    const r = bestTotal(
      listing("l", "s1", 0.7),
      store("s1"),
      [code({ id: "pct", value: 90 }), code({ id: "flat", type: "flat", value: 0.63 })],
      settings,
      NOW,
    );
    expect(r.code?.id).toBe("pct");
  });
  it("uses the highest cashback offer, first on tie", () => {
    const st = store("s1", {
      cashback: [
        { provider: "A", ratePct: 2 },
        { provider: "B", ratePct: 6 },
        { provider: "C", ratePct: 6 },
      ],
    });
    expect(total([], st).cashback).toEqual({ provider: "B", ratePct: 6, amount: 6 });
  });
  it("equals the price with no codes and no cashback", () => {
    const r = total([], store("s1"));
    expect(r).toEqual({ listingId: "l", price: 100, code: null, cashback: null, total: 100 });
  });
});

describe("bestDeal", () => {
  const stores = [store("s1", { name: "B" }), store("s2", { name: "A" })];
  it("picks the lowest total among in-stock listings", () => {
    const l = [listing("a", "s1", 100), listing("b", "s2", 90, { stockBySize: {} })];
    expect(bestDeal(l, stores, [], "9", settings, NOW)?.listingId).toBe("a");
  });
  it("is null when nothing is in stock", () => {
    expect(bestDeal([listing("a", "s1", 100)], stores, [], "11", settings, NOW)).toBeNull();
  });
  it("breaks ties new first, then store name", () => {
    const l = [listing("u", "s2", 100, { condition: "used" }), listing("n", "s1", 100)];
    expect(bestDeal(l, stores, [], "9", settings, NOW)?.listingId).toBe("n");
    const l2 = [listing("b", "s1", 100), listing("a", "s2", 100)];
    expect(bestDeal(l2, stores, [], "9", settings, NOW)?.listingId).toBe("a");
  });
  it("ties totals that are equal to the cent: new wins with a flat code", () => {
    const st = [store("s1", { name: "Alpha" }), store("s2", { name: "Beta" })];
    // 10.05 - 5 is 5.050000000000001 in floats.
    const l = [listing("u", "s2", 5.05, { condition: "used" }), listing("n", "s1", 10.05)];
    const codes = [code({ type: "flat", value: 5 })];
    expect(bestDeal(l, st, codes, "9", settings, NOW)?.listingId).toBe("n");
  });
  it("ties totals that are equal to the cent: new wins with a pct code", () => {
    const st = [store("s1", { name: "Alpha" }), store("s2", { name: "Beta" })];
    // 10.30 - 10% is 9.270000000000001 in floats.
    const l = [listing("u", "s2", 9.27, { condition: "used" }), listing("n", "s1", 10.3)];
    expect(bestDeal(l, st, [code({ value: 10 })], "9", settings, NOW)?.listingId).toBe("n");
  });
  it("ties totals that are equal to the cent: new wins with cashback", () => {
    const st = [store("s1", { name: "Alpha", cashback: [{ provider: "A", ratePct: 10 }] }), store("s2", { name: "Beta" })];
    const l = [listing("u", "s2", 9.27, { condition: "used" }), listing("n", "s1", 10.3)];
    expect(bestDeal(l, st, [], "9", settings, NOW)?.listingId).toBe("n");
  });
  it("breaks name ties in a fixed locale, case-insensitively", () => {
    const st = [store("s1", { name: "Zappos" }), store("s2", { name: "eBay" })];
    const l = [listing("z", "s1", 100), listing("e", "s2", 100)];
    expect(bestDeal(l, st, [], "9", settings, NOW)?.listingId).toBe("e");
  });
});

describe("cheapestTrustedListing", () => {
  it("skips a cheaper low-trust store", () => {
    const stores = [
      store("bad", { trust: { lowTrust: true, reasons: ["no_https"] } }),
      store("good"),
    ];
    const l = [listing("x", "bad", 10), listing("y", "good", 50)];
    expect(cheapestTrustedListing(l, stores, "9")?.id).toBe("y");
    expect(cheapestListing(l, stores, "9")?.id).toBe("x");
  });
  it("is null when all are low-trust", () => {
    const stores = [store("bad", { trust: { lowTrust: true, reasons: ["no_https"] } })];
    expect(cheapestTrustedListing([listing("x", "bad", 10)], stores, "9")).toBeNull();
  });
});

describe("fixture consistency", () => {
  const size = cmp.item.selectedSize;
  const storeOf = (l: Listing) => cmp.stores.find((s) => s.id === l.storeId)!;
  it("matches comparison.json", () => {
    expect(cheapestListing(cmp.listings, cmp.stores, size)?.id).toBe(cmp.cheapestListingId);
    expect(cheapestTrustedListing(cmp.listings, cmp.stores, size)?.id).toBe(cmp.cheapestTrustedListingId);
    expect(cmp.listings.map((l) => bestTotal(l, storeOf(l), codesAll, fixtureSettings, NOW))).toEqual(cmp.bestDeals);
    expect(bestDeal(cmp.listings, cmp.stores, codesAll, size, fixtureSettings, NOW)).toEqual(cmp.bestDeal);
  });
  it("matches codes.json and store trust", () => {
    expect(
      codesAll.filter((c) => isFresh(c, fixtureSettings.freshnessHours, NOW) && !isExpired(c, NOW)),
    ).toEqual(codesDefault);
    for (const s of cmp.stores) {
      const { trust, ...rest } = s;
      expect(trustFlags(rest)).toEqual(trust);
    }
  });
});

describe("bestCashback", () => {
  it("null for no offers", () => expect(bestCashback([])).toBeNull());
  it("picks the highest rate", () => {
    expect(bestCashback([{ provider: "A", ratePct: 2 }, { provider: "B", ratePct: 5 }])).toEqual({ provider: "B", ratePct: 5 });
  });
  it("first wins on a tie", () => {
    expect(bestCashback([{ provider: "A", ratePct: 3 }, { provider: "B", ratePct: 3 }])?.provider).toBe("A");
  });
});
