// API contract types. Route handlers return ApiOk<T> or ApiError.
// Fixtures in fixtures/ hold the unwrapped payload T, with dates in toISOString()
// form and a reference time of 2026-10-29T16:00:00.000Z.
// Percent fields (ratePct, pct code value) use 5 = 5%. Flat code value is USD.

export type DataSource = "live" | "demo";
export type ListingCondition = "new" | "used" | "resale";
export type FreshnessHours = 6 | 12 | 24 | 48 | 72;
export type CashbackOffer = { provider: string; ratePct: number };
export type TrustReason = "no_https" | "few_photo_reviews" | "low_rating";
export type TrustFlags = { lowTrust: boolean; reasons: TrustReason[] };

export type Store = {
  id: string;
  name: string;
  domain: string;
  sellerName: string;
  isHttps: boolean;
  photoReviewCount: number;
  rating: number;
  fictional: boolean;
  cashback: CashbackOffer[];
  trust: TrustFlags;
};

export type Item = {
  id: string;
  name: string;
  category: string;
  sizes: string[];
  selectedSize: string;
  typicalPrice: number;
  imageUrl: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Listing = {
  id: string;
  itemId: string;
  storeId: string;
  price: number;
  condition: ListingCondition;
  url: string;
  /** Units in stock per size. A size key that is missing means 0 in stock. */
  stockBySize: Record<string, number>;
  updatedAt: string;
  source: DataSource;
};

/**
 * GET /api/codes (default list: live, fresh, not expired; fixtures/codes.json).
 * With showDead=true the full list is returned (fixtures/codes-all.json).
 * cashback is the store's highest-ratePct offer, or null.
 */
export type Code = {
  id: string;
  storeId: string;
  storeName: string;
  code: string;
  label: string;
  type: "pct" | "flat";
  value: number;
  minSpend: number | null;
  firstOrderOnly: boolean;
  /** A code with expiresAt at or before now is excluded from the default Codes list and from best totals, even when status is live. */
  expiresAt: string | null;
  status: "live" | "dead";
  /** Fresh means strictly less than freshnessHours ago; exactly freshnessHours ago is stale. */
  lastCheckedAt: string;
  cashback: CashbackOffer | null;
};

/**
 * Applicable code rule: same store, status live, fresh (checked less than
 * settings.freshnessHours ago), not expired, listing price >= minSpend, and not
 * firstOrderOnly unless settings.firstOrderEligible. A pct value is a percent and a
 * flat value is USD; the discount is capped at the price. Cashback is the store's
 * highest ratePct offer applied to price minus discount.
 * Amounts are unrounded. total = price - code.discount - cashback.amount.
 * Code choice: the applicable code with the largest discount, one code per listing,
 * no stacking. Discounts compare to the cent. On a tie the code that comes first
 * in the codes list the backend reads wins.
 */
export type BestDeal = {
  listingId: string;
  price: number;
  code: { id: string; code: string; discount: number } | null;
  cashback: (CashbackOffer & { amount: number }) | null;
  total: number;
};

/** GET /api/items/[id]/listings */
export type ItemComparison = {
  item: Item;
  /** Only stores referenced by some listing. Join listings to stores by storeId. */
  stores: Store[];
  listings: Listing[];
  /**
   * Lowest price among listings in stock for item.selectedSize, or null when none.
   * Used and resale listings count, and so do low-trust stores. Tie: new condition
   * first, then store name A to Z. WishlistItem.cheapest is the overall cheapest by
   * this same rule.
   */
  cheapestListingId: string | null;
  /** Same rule as cheapestListingId, over stores with trust.lowTrust === false only. */
  cheapestTrustedListingId: string | null;
  /** One entry per listing (including out of stock), in listings order. */
  bestDeals: BestDeal[];
  /**
   * Lowest total among listings in stock for item.selectedSize, or null. Total is
   * price minus best applicable code minus cashback on the post-code price. Totals
   * compare to the cent. Tie: new condition first, then store name A to Z. It may pick
   * a low-trust listing: the UI warns instead of hiding it, and finds the trusted
   * alternative in bestDeals through cheapestTrustedListingId.
   */
  bestDeal: BestDeal | null;
  /** Lowest total among listings in stock for item.selectedSize at stores that pass trustFlags, or null. */
  bestTrustedDeal: BestDeal | null;
};

/** GET /api/items */
export type WishlistItem = Item & {
  /** The cheapest in-stock listing for the saved size, with what a card needs to label it honestly. */
  cheapest: {
    listingId: string;
    storeName: string;
    price: number;
    condition: ListingCondition;
    source: DataSource;
    fictional: boolean;
    lowTrust: boolean;
  } | null;
};

/** GET /api/settings */
export type Settings = { freshnessHours: FreshnessHours; firstOrderEligible: boolean };

/** GET /api/watches */
export type Watch = {
  id: string;
  itemId: string;
  size: string;
  targetPrice: number | null;
  lowStockAt: number;
  baselinePrice: number;
  active: boolean;
  createdAt: string;
};

export type AlertKind = "price_drop" | "low_size" | "out_of_stock";

/**
 * POST /api/watches success data: the new Watch plus alreadyMet. alreadyMet is true when
 * the current cheapest in-stock price for the saved size is already at or below
 * targetPrice at creation. Alerts stay crossing-only, so no alert fires for this; the UI
 * uses the flag to say the item is already at the target.
 */
export type CreatedWatch = Watch & { alreadyMet: boolean };

/**
 * size is the saved size the alert is about. It stays on the alert after its watch is
 * deleted (watchId null). low_size qty is summed across stores, so there is no store name.
 */
export type Alert = {
  id: string;
  watchId: string | null;
  itemId: string;
  itemName: string;
  size: string;
  read: boolean;
  createdAt: string;
} & (
  | { kind: "price_drop"; detail: { from: number; to: number } }
  | { kind: "low_size"; detail: { qty: number } }
  | { kind: "out_of_stock"; detail: { qty: 0 } }
);

/** GET /api/alerts */
export type AlertsResponse = {
  groups: { itemId: string; itemName: string; unread: number; alerts: Alert[] }[];
  unreadCount: number;
  /** Read alerts in the database (all of them, not only the ones loaded), for Clear read alerts. */
  readCount: number;
};

/** POST /api/items/[id]/refresh */
export type RefreshResult = { comparison: ItemComparison; alertsCreated: number; listingsChanged: number };

export type ApiOk<T> = { data: T };
export type ApiError = {
  error: { code: string; message: string; retryAfterSeconds?: number };
};
