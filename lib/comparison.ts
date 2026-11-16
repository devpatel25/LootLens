import { toCode, toItem, toListing, toStore } from "@/lib/dto";
import { bestDeal, bestTotal, cheapestListing, cheapestTrustedListing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import type { ItemComparison } from "@/lib/types";

/** The user's item with its listings, stores and best deals, or null when not found or not owned. */
export async function loadComparison(itemId: string, userId: string): Promise<ItemComparison | null> {
  const row = await prisma.item.findFirst({
    where: { id: itemId, userId },
    include: { listings: { orderBy: [{ price: "asc" }, { id: "asc" }], include: { store: true } } },
  });
  if (!row) return null;

  const item = toItem(row);
  const listings = row.listings.map(toListing);
  const storeRows = [...new Map(row.listings.map((l) => [l.store.id, l.store])).values()];
  const stores = storeRows.map(toStore).sort((a, b) => a.name.localeCompare(b.name));
  const codes = (
    await prisma.code.findMany({ where: { storeId: { in: stores.map((s) => s.id) } }, include: { store: true }, orderBy: { id: "asc" } })
  ).map(toCode);
  const settings = await getSettings(userId);

  const bestDeals = listings.map((l) => bestTotal(l, stores.find((s) => s.id === l.storeId)!, codes, settings));
  return {
    item,
    stores,
    listings,
    cheapestListingId: cheapestListing(listings, stores, item.selectedSize)?.id ?? null,
    cheapestTrustedListingId: cheapestTrustedListing(listings, stores, item.selectedSize)?.id ?? null,
    bestDeals,
    bestDeal: bestDeal(listings, stores, codes, item.selectedSize, settings),
  };
}
