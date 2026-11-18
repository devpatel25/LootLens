import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Wishlist</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Your saved items with their cheapest price will show here.</p>
    </>
  );
}
