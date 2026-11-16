import Link from "next/link";
import EmptyState from "@/components/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      title="Item not found"
      message="It may have been deleted, or it is not on your wishlist."
      action={
        <Link
          href="/wishlist"
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Back to wishlist
        </Link>
      }
    />
  );
}
