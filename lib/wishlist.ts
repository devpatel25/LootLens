import { listingsInclude, toItem, toListingsAndStores } from "@/lib/dto";
import { MAX_ITEMS_PER_USER } from "@/lib/itemSchema";
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

/** The user's items (at most the per-user cap), newest first, each with its cheapest in-stock listing for the saved size. */
export async function loadWishlist(userId: string): Promise<WishlistItem[]> {
  const rows = await prisma.item.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: listingsInclude,
    take: MAX_ITEMS_PER_USER,
  });
  return rows.map((row) => {
    const { listings, stores } = toListingsAndStores(row.listings);
    const best = cheapestListing(listings, stores, row.selectedSize);
    return { ...toItem(row), cheapest: best ? cheapestFor(best, stores) : null };
  });
}

/**
 * True when anything the Wishlist cards show may be demo data: a demo price, or a card with no price at all
 * (its "no store has your size" comes from the listings' stock). Like Item Detail it errs toward the badge:
 * a card with only live listings, none in the saved size, also counts.
 */
export function wishlistShowsDemo(items: WishlistItem[]): boolean {
  return items.some((i) => !i.cheapest || i.cheapest.source === "demo");
}

/** True when any listing on the user's items is demo data. */
export async function hasDemoListings(userId: string): Promise<boolean> {
  const demo = await prisma.listing.findFirst({ where: { source: "DEMO", item: { userId } }, select: { id: true } });
  return demo !== null;
}
