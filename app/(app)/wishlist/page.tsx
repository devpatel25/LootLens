import type { Metadata } from "next";
import { Suspense } from "react";
import WishlistView from "@/components/WishlistView";
import { requirePageUserId } from "@/lib/currentUser";
import { loadWishlistPage } from "@/lib/wishlist";
import Loading from "./loading";

export const metadata: Metadata = { title: "Wishlist" };

async function Wishlist() {
  const userId = await requirePageUserId("/wishlist");
  const { items, anyDemo } = await loadWishlistPage(userId);
  return <WishlistView items={items} anyDemo={anyDemo} />;
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Wishlist />
    </Suspense>
  );
}
