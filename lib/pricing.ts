import type { BestDeal, CashbackOffer, Code, Listing, Settings, Store, TrustFlags, TrustReason } from "./types";

// Starting values for the low-trust rule.
export const TRUST_MIN_PHOTO_REVIEWS = 20;
export const TRUST_MIN_RATING = 3.5;

/** Units in stock for a size. A size missing from the listing counts as zero. */
export function stockInSize(listing: Listing, size: string): number {
  return listing.stockBySize[size] ?? 0;
}

/** A copy of the listings ordered by price, lowest first. */
export function sortByPrice(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => a.price - b.price);
}

export const storeName = (stores: Store[], l: Listing) => stores.find((s) => s.id === l.storeId)?.name ?? "";

const twoDecimals = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
/** Whole cents as the UI shows them (same Intl rounding as the USD display), so totals that look equal compare equal. */
export const cents = (x: number) => Math.round(Number(twoDecimals.format(x)) * 100);

/** Store name for a listing, from a lookup built once per call (not a find per comparison). */
function storeNames(stores: Store[]): (l: Listing) => string {
  const byId = new Map(stores.map((s) => [s.id, s.name]));
  return (l) => byId.get(l.storeId) ?? "";
}

/** Tie rule: new condition first, then store name A to Z. Negative when a wins. */
function tieBreak(a: Listing, b: Listing, nameOf: (l: Listing) => string): number {
  if ((a.condition === "new") !== (b.condition === "new")) return a.condition === "new" ? -1 : 1;
  return nameOf(a).localeCompare(nameOf(b), "en");
}

/** The lowest-priced listing in stock for the size, or null. Used and resale count. */
export function cheapestListing(listings: Listing[], stores: Store[], size: string): Listing | null {
  const nameOf = storeNames(stores);
  let best: Listing | null = null;
  for (const l of listings) {
    if (stockInSize(l, size) <= 0) continue;
    // Compare in the cents shown, so prices that display the same are a tie (Story 3 tie rule).
    const diff = best === null ? -1 : cents(l.price) - cents(best.price);
    if (diff < 0 || (diff === 0 && tieBreak(l, best!, nameOf) < 0)) {
      best = l;
    }
  }
  return best;
}

/** Live and checked strictly less than `hours` ago. */
export function isFresh(
  code: Pick<Code, "status" | "lastCheckedAt">,
  hours: number,
  now = new Date(),
): boolean {
  return code.status === "live" && now.getTime() - Date.parse(code.lastCheckedAt) < hours * 3_600_000;
}

export function isExpired(code: Pick<Code, "expiresAt">, now = new Date()): boolean {
  return code.expiresAt !== null && Date.parse(code.expiresAt) <= now.getTime();
}

export function trustFlags(store: Omit<Store, "trust">): TrustFlags {
  const reasons: TrustReason[] = [];
  if (!store.isHttps) reasons.push("no_https");
  if (store.photoReviewCount < TRUST_MIN_PHOTO_REVIEWS) reasons.push("few_photo_reviews");
  if (store.rating < TRUST_MIN_RATING) reasons.push("low_rating");
  return { lowTrust: reasons.length > 0, reasons };
}

/** The offer with the highest ratePct; on a tie the first wins. Null when there are none. */
export function bestCashback(offers: CashbackOffer[]): CashbackOffer | null {
  let best: CashbackOffer | null = null;
  for (const o of offers) if (best === null || o.ratePct > best.ratePct) best = o;
  return best;
}

/** Price minus best applicable code minus cashback on the post-code price. Unrounded. */
export function bestTotal(
  listing: Listing,
  store: Store,
  codes: Code[],
  settings: Settings,
  now = new Date(),
): BestDeal {
  const { price } = listing;
  let code: BestDeal["code"] = null;
  for (const c of codes) {
    if (
      c.storeId !== listing.storeId ||
      !isFresh(c, settings.freshnessHours, now) ||
      isExpired(c, now) ||
      price < (c.minSpend ?? 0) ||
      (c.firstOrderOnly && !settings.firstOrderEligible)
    ) {
      continue;
    }
    const discount = Math.min(price, c.type === "pct" ? (price * c.value) / 100 : c.value);
    if (code === null || cents(discount) > cents(code.discount)) code = { id: c.id, code: c.code, discount };
  }
  const afterCode = price - (code?.discount ?? 0);

  const offer = bestCashback(store.cashback);
  const cashback = offer ? { ...offer, amount: (afterCode * offer.ratePct) / 100 } : null;

  return { listingId: listing.id, price, code, cashback, total: afterCode - (cashback?.amount ?? 0) };
}

/** Lowest total among listings in stock for the size whose store exists. */
export function bestDeal(
  listings: Listing[],
  stores: Store[],
  codes: Code[],
  size: string,
  settings: Settings,
  now = new Date(),
): BestDeal | null {
  const nameOf = storeNames(stores);
  let best: { deal: BestDeal; listing: Listing } | null = null;
  for (const listing of listings) {
    const store = stores.find((s) => s.id === listing.storeId);
    if (!store || stockInSize(listing, size) <= 0) continue;
    const deal = bestTotal(listing, store, codes, settings, now);
    if (
      best === null ||
      cents(deal.total) < cents(best.deal.total) ||
      (cents(deal.total) === cents(best.deal.total) && tieBreak(listing, best.listing, nameOf) < 0)
    ) {
      best = { deal, listing };
    }
  }
  return best?.deal ?? null;
}

/** Cheapest listing in stock whose store exists and is not low-trust. */
export function cheapestTrustedListing(
  listings: Listing[],
  stores: Store[],
  size: string,
): Listing | null {
  const trusted = listings.filter((l) => stores.some((s) => s.id === l.storeId && !s.trust.lowTrust));
  return cheapestListing(trusted, stores, size);
}

/** Display order for the comparison table: price, then the Story 3 tie rule (new first, then store A to Z). */
export function sortForComparison(listings: Listing[], stores: Store[]): Listing[] {
  const nameOf = storeNames(stores);
  // Cents, the same comparison as cheapestListing, so the first in-stock row is the one marked Cheapest.
  return [...listings].sort((a, b) => cents(a.price) - cents(b.price) || tieBreak(a, b, nameOf));
}
