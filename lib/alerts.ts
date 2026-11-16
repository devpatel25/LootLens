import { cheapestListing, stockInSize } from "@/lib/pricing";
import type { AlertKind, Listing, Store } from "@/lib/types";

/** Matches the Watch.lowStockAt column default. */
export const DEFAULT_LOW_STOCK = 3;

export type WatchRule = { targetPrice: number | null; baselinePrice: number; lowStockAt: number };
export type WatchNow = { price: number | null; stock: number };

export function evaluateWatch(watch: WatchRule, now: WatchNow): { priceCondMet: boolean; stockCondMet: boolean } {
  const { price } = now;
  const priceCondMet = price !== null && (watch.targetPrice !== null ? price <= watch.targetPrice : price < watch.baselinePrice);
  return { priceCondMet, stockCondMet: now.stock <= watch.lowStockAt };
}

export function alertKindForStock(stock: number): Extract<AlertKind, "low_size" | "out_of_stock"> {
  return stock === 0 ? "out_of_stock" : "low_size";
}

/** Cheapest in-stock price for the size, and total units for the size across all listings. */
export function currentForSize(listings: Listing[], stores: Store[], size: string): WatchNow {
  return {
    price: cheapestListing(listings, stores, size)?.price ?? null,
    stock: listings.reduce((n, l) => n + stockInSize(l, size), 0),
  };
}
