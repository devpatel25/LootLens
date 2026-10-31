import comparisonFixture from "@/fixtures/comparison.json";
import type { ItemComparison, Listing } from "./types";

// Stand-in for GET /api/items/[id]/listings until the route is live (#9).
// The fixture marks the whole file as demo, so every listing gets source "demo".
export function getDemoComparison(itemId: string): ItemComparison | null {
  if (comparisonFixture.item.id !== itemId) return null;
  const source = comparisonFixture.demo ? "demo" : "live";
  return {
    item: comparisonFixture.item,
    stores: comparisonFixture.stores,
    listings: comparisonFixture.listings.map(
      (listing): Listing => ({
        ...listing,
        condition: listing.condition as Listing["condition"],
        stockBySize: listing.stockBySize as Record<string, number>,
        source,
      }),
    ),
  };
}

export function demoItemIds(): string[] {
  return [comparisonFixture.item.id];
}
