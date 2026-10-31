import type { Listing } from "./types";

/** Units in stock for a size. A size missing from the listing counts as zero. */
export function stockInSize(listing: Listing, size: string): number {
  return listing.stockBySize[size] ?? 0;
}

/**
 * The lowest-priced listing with the size in stock, or null when none has it.
 * Used and resale listings count. On a price tie a new listing wins, then input order.
 */
export function cheapestListing(listings: Listing[], size: string): Listing | null {
  let best: Listing | null = null;
  for (const listing of listings) {
    if (stockInSize(listing, size) <= 0) continue;
    if (
      best === null ||
      listing.price < best.price ||
      (listing.price === best.price && listing.condition === "new" && best.condition !== "new")
    ) {
      best = listing;
    }
  }
  return best;
}

/** A copy of the listings ordered by price, lowest first. */
export function sortByPrice(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => a.price - b.price);
}
