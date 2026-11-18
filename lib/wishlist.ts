import { listingsInclude, toItem, toListingsAndStores } from "@/lib/dto";
import { cheapestListing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import type { Listing, Store, WishlistItem } from "@/lib/types";

function cheapestFor(best: Listing, stores: Store[]): NonNullable<WishlistItem["cheapest"]> {
  const store = stores.find((s) => s.id === best.storeId);
  return {
    listingId: best.id,
    storeName: store?.name ?? "",
    price: best.price,
    condition: best.condition,
    source: best.source,
    fictional: store?.fictional ?? false,
    lowTrust: store?.trust.lowTrust ?? false,
  };
}

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
    return { ...toItem(row), cheapest: best ? cheapestFor(best, stores) : null };
  });
}

/**
 * True when anything the Wishlist cards show is demo data: a demo price, or a card with no price at all
 * (its "no store has your size" comes from listings that are not live). Same rule as Item Detail.
 */
export function wishlistShowsDemo(items: WishlistItem[]): boolean {
  return items.some((i) => !i.cheapest || i.cheapest.source === "demo");
}

/** True when any listing on the user's items is demo data. */
export async function hasDemoListings(userId: string): Promise<boolean> {
  const demo = await prisma.listing.findFirst({ where: { source: "DEMO", item: { userId } }, select: { id: true } });
  return demo !== null;
}
