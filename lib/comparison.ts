import { listingsInclude, toCode, toItem, toListingsAndStores } from "@/lib/dto";
import { bestDeal, bestTotal, cheapestListing, cheapestTrustedListing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import type { ItemComparison } from "@/lib/types";

/** The user's item with its listings, stores and best deals, or null when not found or not owned. */
export async function loadComparison(itemId: string, userId: string): Promise<ItemComparison | null> {
  const [row, settings] = await Promise.all([
    prisma.item.findFirst({ where: { id: itemId, userId }, include: listingsInclude }),
    getSettings(userId),
  ]);
  if (!row) return null;

  const item = toItem(row);
  const { listings, stores } = toListingsAndStores(row.listings);
  const codes = (
    await prisma.code.findMany({
      where: { storeId: { in: stores.map((s) => s.id) }, status: "LIVE" },
      include: { store: true },
      orderBy: { id: "asc" },
    })
  ).map(toCode);

  const now = new Date();
  const bestDeals = listings.map((l) => bestTotal(l, stores.find((s) => s.id === l.storeId)!, codes, settings, now));
  return {
    item,
    stores,
    listings,
    cheapestListingId: cheapestListing(listings, stores, item.selectedSize)?.id ?? null,
    cheapestTrustedListingId: cheapestTrustedListing(listings, stores, item.selectedSize)?.id ?? null,
    bestDeals,
    bestDeal: bestDeal(listings, stores, codes, item.selectedSize, settings, now),
  };
}
