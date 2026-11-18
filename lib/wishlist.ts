import { listingsInclude, toItem, toListingsAndStores } from "@/lib/dto";
import { cheapestListing, storeName } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import type { Listing, Store, WishlistItem } from "@/lib/types";

function cheapestFor(best: Listing, stores: Store[]): NonNullable<WishlistItem["cheapest"]> {
  const store = stores.find((s) => s.id === best.storeId);
  return {
    listingId: best.id,
    storeName: storeName(stores, best),
    price: best.price,
    condition: best.condition,
    source: best.source,
    fictional: store?.fictional ?? false,
    lowTrust: store?.trust.lowTrust ?? false,
  };
}

/** The user's items, newest first, each with its cheapest in-stock listing for the saved size. */
export async function loadWishlist(userId: string): Promise<WishlistItem[]> {
  return (await loadWishlistPage(userId)).items;
}

/** Items plus whether any listing on them is demo data, from one query (the Wishlist page uses both). */
export async function loadWishlistPage(userId: string): Promise<{ items: WishlistItem[]; anyDemo: boolean }> {
  const rows = await prisma.item.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: listingsInclude,
  });
  let anyDemo = false;
  const items = rows.map((row) => {
    const { listings, stores } = toListingsAndStores(row.listings);
    const best = cheapestListing(listings, stores, row.selectedSize);
    if (listings.some((l) => l.source === "demo")) anyDemo = true;
    return {
      ...toItem(row),
      cheapest: best ? cheapestFor(best, stores) : null,
    };
  });
  return { items, anyDemo };
}

/** True when anything the Wishlist cards show is demo data (stub for the red step). */
export function wishlistShowsDemo(items: WishlistItem[]): boolean {
  void items;
  return false;
}

/** True when any listing on the user's items is demo data. */
export async function hasDemoListings(userId: string): Promise<boolean> {
  const demo = await prisma.listing.findFirst({ where: { source: "DEMO", item: { userId } }, select: { id: true } });
  return demo !== null;
}
