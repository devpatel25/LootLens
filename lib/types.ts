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
  /** A code with expiresAt before now is excluded from the default Codes list and from best totals, even when status is live. */
  expiresAt: string | null;
  status: "live" | "dead";
  lastCheckedAt: string;
  cashback: CashbackOffer | null;
};

/** Amounts are unrounded. total = price - code.discount - cashback.amount. */
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
  cheapestListingId: string | null;
  cheapestTrustedListingId: string | null;
  /** One entry per listing (including out of stock), in listings order. */
  bestDeals: BestDeal[];
  /** Lowest total among listings in stock for item.selectedSize, or null. */
  bestDeal: BestDeal | null;
};

/** GET /api/items */
export type WishlistItem = Item & {
  cheapest: { listingId: string; storeName: string; price: number } | null;
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

/** Detail: price_drop { from, to }, low_size { qty }, out_of_stock { qty: 0 }. */
export type Alert = {
  id: string;
  watchId: string | null;
  itemId: string;
  itemName: string;
  kind: AlertKind;
  detail: { from?: number; to?: number; qty?: number };
  read: boolean;
  createdAt: string;
};

/** GET /api/alerts */
export type AlertsResponse = {
  groups: { itemId: string; itemName: string; unread: number; alerts: Alert[] }[];
  unreadCount: number;
};

export type ApiOk<T> = { data: T };
export type ApiError = {
  error: { code: string; message: string; retryAfterSeconds?: number };
};
