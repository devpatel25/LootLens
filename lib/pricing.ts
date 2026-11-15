import type { BestDeal, Code, Listing, Settings, Store, TrustFlags } from "./types";

// Starting values for the low-trust rule.
export const TRUST_MIN_PHOTO_REVIEWS = 20;
export const TRUST_MIN_RATING = 3.5;

export function stockInSize(listing: Listing, size: string): number {
  void listing;
  void size;
  return -1;
}

/** A copy of the listings ordered by price, lowest first. */
export function sortByPrice(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => a.price - b.price);
}

export function cheapestListing(listings: Listing[], stores: Store[], size: string): Listing | null {
  void listings;
  void stores;
  void size;
  return null;
}

export function isFresh(
  code: Pick<Code, "status" | "lastCheckedAt">,
  hours: number,
  now = new Date(),
): boolean {
  void code;
  void hours;
  void now;
  return false;
}

export function isExpired(code: Pick<Code, "expiresAt">, now = new Date()): boolean {
  void code;
  void now;
  return false;
}

export function trustFlags(store: Omit<Store, "trust">): TrustFlags {
  void store;
  return { lowTrust: false, reasons: [] };
}

export function bestTotal(
  listing: Listing,
  store: Store,
  codes: Code[],
  settings: Settings,
  now = new Date(),
): BestDeal {
  void store;
  void codes;
  void settings;
  void now;
  return { listingId: listing.id, price: listing.price, code: null, cashback: null, total: NaN };
}

export function bestDeal(
  listings: Listing[],
  stores: Store[],
  codes: Code[],
  size: string,
  settings: Settings,
  now = new Date(),
): BestDeal | null {
  void listings;
  void stores;
  void codes;
  void size;
  void settings;
  void now;
  return null;
}

export function cheapestTrustedListing(
  listings: Listing[],
  stores: Store[],
  size: string,
): Listing | null {
  void listings;
  void stores;
  void size;
  return null;
}
