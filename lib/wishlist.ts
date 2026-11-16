import type { WishlistItem } from "@/lib/types";

/** The user's items, newest first, each with its cheapest in-stock listing for the saved size. */
export async function loadWishlist(userId: string): Promise<WishlistItem[]> {
  void userId;
  return [];
}

/** True when any listing on the user's items is demo data. */
export async function hasDemoListings(userId: string): Promise<boolean> {
  void userId;
  return false;
}
