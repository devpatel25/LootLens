import { listingsInclude, toItem, toListingsAndStores } from "@/lib/dto";
import { cheapestListing, storeName } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import type { WishlistItem } from "@/lib/types";

/** The user's items, newest first, each with its cheapest in-stock listing for the saved size. */
export async function loadWishlist(userId: string): Promise<WishlistItem[]> {
  const rows = await prisma.item.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: listingsInclude,
  });
  return rows.map((row) => {
    const { listings, stores } = toListingsAndStores(row.listings);
    const best = cheapestListing(listings, stores, row.selectedSize);
    return {
      ...toItem(row),
      // Stub fields for the red step; filled from the listing and store in the fix.
      cheapest: best
        ? { listingId: best.id, storeName: storeName(stores, best), price: best.price, condition: "new" as const, source: "live" as const, fictional: false, lowTrust: false }
        : null,
    };
  });
}

/** True when any listing on the user's items is demo data. */
export async function hasDemoListings(userId: string): Promise<boolean> {
  const demo = await prisma.listing.findFirst({ where: { source: "DEMO", item: { userId } }, select: { id: true } });
  return demo !== null;
}

/** Items plus whether any listing is demo. Stub. */
export async function loadWishlistPage(userId: string): Promise<{ items: WishlistItem[]; anyDemo: boolean }> {
  void userId;
  return { items: [], anyDemo: false };
}
