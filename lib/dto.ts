import type { Alert as DbAlert, Prisma, Code as DbCode, Item as DbItem, Listing as DbListing, Store as DbStore, UserSettings, Watch as DbWatch } from "@/lib/generated/prisma/client";
import { bestCashback, trustFlags } from "@/lib/pricing";
import type { Alert, CashbackOffer, Code, FreshnessHours, Item, Listing, Settings, Store, Watch } from "@/lib/types";

const iso = (d: Date) => d.toISOString();

export function toStore(s: DbStore): Store {
  const base = {
    id: s.id,
    name: s.name,
    domain: s.domain,
    sellerName: s.sellerName,
    isHttps: s.isHttps,
    photoReviewCount: s.photoReviewCount,
    rating: s.rating.toNumber(),
    fictional: s.fictional,
    cashback: s.cashback as CashbackOffer[],
  };
  return { ...base, trust: trustFlags(base) };
}

export function toItem(i: DbItem): Item {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    sizes: i.sizes,
    selectedSize: i.selectedSize,
    typicalPrice: i.typicalPrice.toNumber(),
    imageUrl: i.imageUrl,
    sourceUrl: i.sourceUrl,
    createdAt: iso(i.createdAt),
    updatedAt: iso(i.updatedAt),
  };
}

export function toListing(l: DbListing): Listing {
  return {
    id: l.id,
    itemId: l.itemId,
    storeId: l.storeId,
    price: l.price.toNumber(),
    condition: l.condition.toLowerCase() as Listing["condition"],
    url: l.url,
    stockBySize: l.stockBySize as Record<string, number>,
    updatedAt: iso(l.updatedAt),
    source: l.source.toLowerCase() as Listing["source"],
  };
}

/** The row must be loaded with include: { store: true }. */
export function toCode(c: DbCode & { store: DbStore }): Code {
  return {
    id: c.id,
    storeId: c.storeId,
    storeName: c.store.name,
    code: c.code,
    label: c.label,
    type: c.type.toLowerCase() as Code["type"],
    value: c.value.toNumber(),
    minSpend: c.minSpend?.toNumber() ?? null,
    firstOrderOnly: c.firstOrderOnly,
    expiresAt: c.expiresAt ? iso(c.expiresAt) : null,
    status: c.status.toLowerCase() as Code["status"],
    lastCheckedAt: iso(c.lastCheckedAt),
    cashback: bestCashback(c.store.cashback as CashbackOffer[]),
  };
}

export function toSettings(s: UserSettings): Settings {
  return { freshnessHours: s.freshnessHours as FreshnessHours, firstOrderEligible: s.firstOrderEligible };
}

/** Listings and the stores they reference (each once, A to Z), from rows loaded with include: { store: true }. */
export function toListingsAndStores(rows: (DbListing & { store: DbStore })[]): { listings: Listing[]; stores: Store[] } {
  const stores = [...new Map(rows.map((l) => [l.store.id, l.store])).values()]
    .map(toStore)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { listings: rows.map(toListing), stores };
}

export function toWatch(w: DbWatch): Watch {
  return {
    id: w.id,
    itemId: w.itemId,
    size: w.size,
    targetPrice: w.targetPrice?.toNumber() ?? null,
    lowStockAt: w.lowStockAt,
    baselinePrice: w.baselinePrice.toNumber(),
    active: w.active,
    createdAt: iso(w.createdAt),
  };
}

/** Kind and detail of an alert row, with the detail shaped per kind. */
function alertKindDetail(a: DbAlert): Alert extends infer U ? (U extends Alert ? Pick<U, "kind" | "detail"> : never) : never {
  const d = a.detail as { from?: number; to?: number; qty?: number };
  if (a.kind === "PRICE_DROP") return { kind: "price_drop", detail: { from: d.from as number, to: d.to as number } };
  if (a.kind === "LOW_SIZE") return { kind: "low_size", detail: { qty: d.qty as number } };
  return { kind: "out_of_stock", detail: { qty: 0 } };
}

/** The row must be loaded with include: { item: true }. */
export function toAlert(a: DbAlert & { item: DbItem }): Alert {
  return {
    id: a.id,
    watchId: a.watchId,
    itemId: a.itemId,
    itemName: a.item.name,
    size: a.size,
    read: a.read,
    createdAt: iso(a.createdAt),
    ...alertKindDetail(a),
  };
}

/** Include for an item's listings in price order, with their stores. Pair with toListingsAndStores. */
export const listingsInclude = {
  listings: { orderBy: [{ price: "asc" }, { id: "asc" }], include: { store: true } },
} satisfies Prisma.ItemInclude;
