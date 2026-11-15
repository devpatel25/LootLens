// Fixtures hold the unwrapped payload type. Reference time: 2026-10-29T16:00:00.000Z.
import { describe, expect, it } from "vitest";
import comparison from "@/fixtures/comparison.json";
import wishlist from "@/fixtures/wishlist.json";
import codes from "@/fixtures/codes.json";
import codesAll from "@/fixtures/codes-all.json";
import alerts from "@/fixtures/alerts.json";
import settings from "@/fixtures/settings.json";
import type { AlertsResponse, Code, ItemComparison, Settings, WishlistItem } from "@/lib/types";

// JSON imports widen literals, so compare against a widened shape.
type Json<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends null
        ? null
        : T extends (infer U)[]
          ? Json<U>[]
          : T extends object
            ? { [K in keyof T]: Json<T[K]> }
            : T;

comparison satisfies Json<ItemComparison>;
wishlist satisfies Json<WishlistItem>[];
codes satisfies Json<Code>[];
codesAll satisfies Json<Code>[];
alerts satisfies Json<AlertsResponse>;
settings satisfies Json<Settings>;

const keys = (o: object) => Object.keys(o).sort();
const c = comparison as unknown as ItemComparison;
const codeList = codes as unknown as Code[];
const allCodes = codesAll as unknown as Code[];
const alertData = alerts as unknown as AlertsResponse;
const NOW = Date.parse("2026-10-29T16:00:00.000Z");
const DAY = 24 * 3600 * 1000;
const isStale = (k: Code) => NOW - Date.parse(k.lastCheckedAt) >= DAY;
const isExpired = (k: Code) => k.expiresAt !== null && Date.parse(k.expiresAt) < NOW;

const ITEM_KEYS = ["category", "createdAt", "id", "imageUrl", "name", "selectedSize", "sizes", "sourceUrl", "typicalPrice", "updatedAt"];
const CODE_KEYS = ["cashback", "code", "expiresAt", "firstOrderOnly", "id", "label", "lastCheckedAt", "minSpend", "status", "storeId", "storeName", "type", "value"];

describe("contract fixtures", () => {
  it("has exact top-level keys", () => {
    expect(keys(comparison)).toEqual([
      "bestDeal",
      "bestDeals",
      "cheapestListingId",
      "cheapestTrustedListingId",
      "item",
      "listings",
      "stores",
    ]);
    expect(keys(alerts)).toEqual(["groups", "unreadCount"]);
    expect(keys(settings)).toEqual(["firstOrderEligible", "freshnessHours"]);
  });

  it("uses allowed literal values", () => {
    for (const l of c.listings) {
      expect(["new", "used", "resale"]).toContain(l.condition);
      expect(l.source).toBe("demo");
    }
    for (const k of codeList) {
      expect(["pct", "flat"]).toContain(k.type);
      expect(["live", "dead"]).toContain(k.status);
    }
    for (const g of alertData.groups)
      for (const a of g.alerts)
        expect(["price_drop", "low_size", "out_of_stock"]).toContain(a.kind);
    expect([6, 12, 24, 48, 72]).toContain(settings.freshnessHours);
  });

  it("resolves listing references", () => {
    const ids = c.listings.map((l) => l.id);
    expect(c.cheapestListingId).toBe("lst-fbm");
    expect(c.cheapestTrustedListingId).toBe("lst-fbm");
    expect(ids).toContain(c.cheapestListingId);
    expect(ids).toContain(c.cheapestTrustedListingId);
    expect(ids).toContain(c.bestDeal?.listingId);
    expect(c.bestDeals.map((d) => d.listingId)).toEqual(ids);
    const storeIds = c.stores.map((s) => s.id);
    for (const l of c.listings) expect(storeIds).toContain(l.storeId);
  });

  it("links the best deal to a code", () => {
    expect(c.bestDeal?.listingId).toBe("lst-adidas");
    expect(c.bestDeal?.total).toBeCloseTo(57, 5);
    expect(codeList.map((k) => k.id)).toContain(c.bestDeal?.code?.id);
  });

  it("keeps deal totals consistent", () => {
    for (const d of c.bestDeals)
      expect(d.total).toBeCloseTo(
        d.price - (d.code?.discount ?? 0) - (d.cashback?.amount ?? 0),
        5,
      );
  });

  it("marks KickSwap fictional and low trust", () => {
    const k = c.stores.find((s) => s.id === "store-kickswap");
    expect(k?.name).toContain("(fictional demo store)");
    expect(k?.fictional).toBe(true);
    expect(k?.trust).toEqual({
      lowTrust: true,
      reasons: ["no_https", "few_photo_reviews", "low_rating"],
    });
  });

  it("sums unread alerts", () => {
    expect(alertData.unreadCount).toBe(
      alertData.groups.reduce((n, g) => n + g.unread, 0),
    );
  });

  it("has exact nested keys", () => {
    expect(keys(c.item)).toEqual(ITEM_KEYS);
    for (const st of c.stores)
      expect(keys(st)).toEqual(["cashback", "domain", "fictional", "id", "isHttps", "name", "photoReviewCount", "rating", "sellerName", "trust"]);
    for (const st of c.stores) expect(keys(st.trust)).toEqual(["lowTrust", "reasons"]);
    for (const l of c.listings)
      expect(keys(l)).toEqual(["condition", "id", "itemId", "price", "source", "stockBySize", "storeId", "updatedAt", "url"]);
    for (const d of c.bestDeals)
      expect(keys(d)).toEqual(["cashback", "code", "listingId", "price", "total"]);
    for (const k of codeList) expect(keys(k)).toEqual(CODE_KEYS);
    for (const k of allCodes) expect(keys(k)).toEqual(CODE_KEYS);
    for (const w of wishlist) expect(keys(w)).toEqual([...ITEM_KEYS, "cheapest"].sort());
    for (const g of alertData.groups) {
      expect(keys(g)).toEqual(["alerts", "itemId", "itemName", "unread"]);
      for (const a of g.alerts)
        expect(keys(a)).toEqual(["createdAt", "detail", "id", "itemId", "itemName", "kind", "read", "watchId"]);
    }
  });

  it("codes.json is the default list: live, fresh, not expired", () => {
    expect(codeList.length).toBeGreaterThan(0);
    for (const k of codeList) {
      expect(k.status).toBe("live");
      expect(isStale(k)).toBe(false);
      expect(isExpired(k)).toBe(false);
    }
  });

  it("codes-all.json is a superset with dead, stale and expired codes", () => {
    const all = allCodes.map((k) => k.id);
    for (const k of codeList) expect(all).toContain(k.id);
    expect(allCodes.some((k) => k.status === "dead")).toBe(true);
    expect(allCodes.some(isStale)).toBe(true);
    expect(allCodes.some(isExpired)).toBe(true);
  });
});
