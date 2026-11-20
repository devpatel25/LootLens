// Fixtures hold the unwrapped payload type. Reference time: 2026-10-29T16:00:00.000Z.
import { describe, expect, it } from "vitest";
import comparison from "@/fixtures/comparison.json";
import wishlist from "@/fixtures/wishlist.json";
import codes from "@/fixtures/codes.json";
import codesAll from "@/fixtures/codes-all.json";
import alerts from "@/fixtures/alerts.json";
import settings from "@/fixtures/settings.json";
import lowTrust from "@/fixtures/comparison-lowtrust.json";
import openapi from "@/public/openapi.json";
import type {
  Alert,
  AlertKind,
  AlertsResponse,
  Code,
  DataSource,
  FreshnessHours,
  ItemComparison,
  ListingCondition,
  Settings,
  TrustReason,
  WishlistItem,
} from "@/lib/types";

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
lowTrust satisfies Json<ItemComparison>;
wishlist satisfies Json<WishlistItem>[];
codes satisfies Json<Code>[];
codesAll satisfies Json<Code>[];
alerts satisfies Json<AlertsResponse>;
settings satisfies Json<Settings>;

// Json<T> widens literal unions, so tie each union to a runtime list in both directions:
// the list and the union must be equal, so either one drifting fails typecheck.
type Same<U, L extends readonly unknown[]> = [U] extends [L[number]] ? ([L[number]] extends [U] ? true : false) : false;
const DATA_SOURCES = ["live", "demo"] as const satisfies readonly DataSource[];
const CONDITIONS = ["new", "used", "resale"] as const satisfies readonly ListingCondition[];
const CODE_TYPES = ["pct", "flat"] as const satisfies readonly Code["type"][];
const CODE_STATUSES = ["live", "dead"] as const satisfies readonly Code["status"][];
const FRESHNESS = [6, 12, 24, 48, 72] as const satisfies readonly FreshnessHours[];
const TRUST_REASONS = ["no_https", "few_photo_reviews", "low_rating"] as const satisfies readonly TrustReason[];
const ALERT_KINDS = ["price_drop", "low_size", "out_of_stock"] as const satisfies readonly Alert["kind"][];
const _exhaustive: [
  Same<DataSource, typeof DATA_SOURCES>,
  Same<ListingCondition, typeof CONDITIONS>,
  Same<Code["type"], typeof CODE_TYPES>,
  Same<Code["status"], typeof CODE_STATUSES>,
  Same<FreshnessHours, typeof FRESHNESS>,
  Same<TrustReason, typeof TRUST_REASONS>,
  Same<AlertKind, typeof ALERT_KINDS>,
  Same<Alert["kind"], typeof ALERT_KINDS>,
  Same<AlertsResponse["groups"][number]["alerts"][number]["kind"], typeof ALERT_KINDS>,
] = [true, true, true, true, true, true, true, true, true];
void _exhaustive;

const keys = (o: object) => Object.keys(o).sort();
const c = comparison as unknown as ItemComparison;
const codeList = codes as unknown as Code[];
const allCodes = codesAll as unknown as Code[];
const alertData = alerts as unknown as AlertsResponse;
const NOW = Date.parse("2026-10-29T16:00:00.000Z");
const LIMIT = settings.freshnessHours * 3_600_000;
const isStale = (k: Code) => NOW - Date.parse(k.lastCheckedAt) >= LIMIT;
const isExpired = (k: Code) => k.expiresAt !== null && Date.parse(k.expiresAt) <= NOW;

const schemas = openapi.components.schemas;
const bothComparisons = [c, lowTrust as unknown as ItemComparison];
const alertKinds = schemas.Alert.oneOf.flatMap((o) => o.properties.kind.enum);

const ITEM_KEYS = ["category", "createdAt", "id", "imageUrl", "name", "selectedSize", "sizes", "sourceUrl", "typicalPrice", "updatedAt"];
const CODE_KEYS = ["cashback", "code", "expiresAt", "firstOrderOnly", "id", "label", "lastCheckedAt", "minSpend", "status", "storeId", "storeName", "type", "value"];

describe("contract fixtures", () => {
  it("has exact top-level keys", () => {
    expect(keys(comparison)).toEqual([
      "bestDeal",
      "bestDeals",
      "bestTrustedDeal",
      "cheapestListingId",
      "cheapestTrustedListingId",
      "item",
      "listings",
      "stores",
    ]);
    expect(keys(alerts)).toEqual(["groups", "readCount", "unreadCount"]);
    expect(keys(settings)).toEqual(["firstOrderEligible", "freshnessHours"]);
  });

  it.each([
    ["listing source", DATA_SOURCES, bothComparisons.flatMap((x) => x.listings.map((l) => l.source)), schemas.Listing.properties.source.enum],
    ["listing condition", CONDITIONS, bothComparisons.flatMap((x) => x.listings.map((l) => l.condition)), schemas.Listing.properties.condition.enum],
    ["code type", CODE_TYPES, [...codeList, ...allCodes].map((k) => k.type), schemas.Code.properties.type.enum],
    ["code status", CODE_STATUSES, [...codeList, ...allCodes].map((k) => k.status), schemas.Code.properties.status.enum],
    ["freshnessHours", FRESHNESS, [settings.freshnessHours], schemas.Settings.properties.freshnessHours.enum],
    ["trust reason", TRUST_REASONS, bothComparisons.flatMap((x) => x.stores.flatMap((s) => s.trust.reasons)), schemas.TrustFlags.properties.reasons.items.enum],
    ["alert kind", ALERT_KINDS, alertData.groups.flatMap((g) => g.alerts.map((a) => a.kind)), alertKinds],
  ] as [string, readonly (string | number)[], (string | number)[], (string | number)[]][])(
    "%s: fixtures use listed values and openapi enum matches",
    (_name, list, used, spec) => {
      expect(used.length).toBeGreaterThan(0);
      for (const v of used) expect(list).toContain(v);
      expect([...spec].sort()).toEqual([...list].sort());
    },
  );

  it("labels every comparison listing demo", () => {
    for (const l of c.listings) expect(l.source).toBe("demo");
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
        expect(keys(a)).toEqual(["createdAt", "detail", "id", "itemId", "itemName", "kind", "read", "size", "watchId"]);
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
    expect(allCodes).toEqual(expect.arrayContaining(codeList));
    expect(allCodes.some((k) => k.status === "dead")).toBe(true);
    expect(allCodes.some(isStale)).toBe(true);
    expect(allCodes.some(isExpired)).toBe(true);
  });

  it("has a code checked exactly freshnessHours ago, only in codes-all.json", () => {
    const edge = allCodes.filter((k) => NOW - Date.parse(k.lastCheckedAt) === LIMIT);
    expect(edge.map((k) => k.code)).toEqual(["STALE15"]);
    expect(isStale(edge[0])).toBe(true);
    expect(codeList.map((k) => k.code)).not.toContain("STALE15");
  });

  it.each([
    ["codes.json", codeList],
    ["codes-all.json", allCodes],
  ])("words SAVE30 as 150 or more in %s", (_name, list) => {
    const k = list.find((x) => x.code === "SAVE30");
    expect(k).toBeDefined();
    expect(k).toMatchObject({ label: "$30 off orders of $150 or more", minSpend: 150, type: "flat", value: 30 });
  });

});

describe("low-trust comparison fixture (Story 6)", () => {
  const l = lowTrust as unknown as ItemComparison;
  const lowIds = l.stores.filter((s) => s.trust.lowTrust).map((s) => s.id);
  const stock = (id: string) => l.listings.find((x) => x.id === id)!.stockBySize[l.item.selectedSize] ?? 0;

  it("has the cheapest in-stock listing at a low-trust store", () => {
    const cheapest = l.listings.find((x) => x.id === l.cheapestListingId)!;
    expect(lowIds).toContain(cheapest.storeId);
    expect(l.cheapestTrustedListingId).not.toBe(l.cheapestListingId);
    const trusted = l.listings.find((x) => x.id === l.cheapestTrustedListingId)!;
    expect(lowIds).not.toContain(trusted.storeId);
    for (const x of l.listings) if (stock(x.id) > 0) expect(x.price).toBeGreaterThanOrEqual(cheapest.price);
    for (const x of l.listings)
      if (stock(x.id) > 0 && !lowIds.includes(x.storeId)) expect(x.price).toBeGreaterThanOrEqual(trusted.price);
  });

  it("picks the low-trust listing as best deal and keeps totals consistent", () => {
    expect(l.bestDeal?.listingId).toBe(l.cheapestListingId);
    expect(l.bestDeals.map((d) => d.listingId)).toEqual(l.listings.map((x) => x.id));
    const inStock = l.bestDeals.filter((d) => stock(d.listingId) > 0);
    expect(l.bestDeal?.total).toBe(Math.min(...inStock.map((d) => d.total)));
    for (const d of l.bestDeals)
      expect(d.total).toBeCloseTo(d.price - (d.code?.discount ?? 0) - (d.cashback?.amount ?? 0), 5);
  });

  it("labels KickSwap fictional and every listing demo", () => {
    const k = l.stores.find((s) => s.id === "store-kickswap");
    expect(k?.fictional).toBe(true);
    expect(k?.name).toContain("(fictional demo store)");
    for (const x of l.listings) expect(x.source).toBe("demo");
  });
});
