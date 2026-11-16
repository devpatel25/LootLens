import type { ListingUpdate } from "@/lib/refresh";
import type { Listing } from "@/lib/types";

/** Pure demo price feed for demo listings only: 10% off to the cent, one unit gone from every size in stock. */
export function demoSource(listings: Listing[]): ListingUpdate[] {
  return listings.filter((l) => l.source === "demo").map((l) => ({
    listingId: l.id,
    price: Math.round(l.price * 0.9 * 100) / 100,
    stockBySize: Object.fromEntries(Object.entries(l.stockBySize).map(([s, n]) => [s, Math.max(0, n - 1)])),
  }));
}
