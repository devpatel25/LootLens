import type { Metadata } from "next";
import { Suspense } from "react";
import LoadingState from "@/components/LoadingState";
import WishlistView from "@/components/WishlistView";
import { requirePageUserId } from "@/lib/currentUser";
import { hasDemoListings, loadWishlist } from "@/lib/wishlist";

export const metadata: Metadata = { title: "Wishlist" };

async function Wishlist() {
  const userId = await requirePageUserId();
  const [items, anyDemo] = await Promise.all([loadWishlist(userId), hasDemoListings(userId)]);
  return <WishlistView items={items} anyDemo={anyDemo} />;
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading wishlist" />}>
      <Wishlist />
    </Suspense>
  );
}
