import Link from "next/link";
import ComparisonTable from "@/components/ComparisonTable";
import DemoDataBadge from "@/components/DemoDataBadge";
import { formatUsd } from "@/lib/format";
import { storeLabel } from "@/lib/storeLabel";
import type { ItemComparison } from "@/lib/types";

export default function ItemDetailView({ comparison }: { comparison: ItemComparison }) {
  const { item, listings, stores, cheapestListingId } = comparison;
  const cheapest = listings.find((l) => l.id === cheapestListingId);
  const cheapestStore = cheapest && stores.find((s) => s.id === cheapest.storeId);
  // Demo unless the page really shows live prices: with no listings, nothing here is live (AGENTS.md section 3).
  const anyDemo = listings.length === 0 || listings.some((l) => l.source === "demo");

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/wishlist"
          className="w-fit text-sm font-medium text-emerald-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-emerald-300"
        >
          Back to wishlist
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
          {anyDemo && <DemoDataBadge />}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Saved size: {item.selectedSize}</p>
        {cheapest && cheapestStore && (
          <p className="text-sm">
            Cheapest of the stores shown: {formatUsd(cheapest.price)} at {storeLabel(cheapestStore)}
          </p>
        )}
      </div>
      <section aria-labelledby="compare-heading" className="flex min-w-0 flex-col gap-3">
        <h2 id="compare-heading" className="text-lg font-semibold">
          Compare stores
        </h2>
        <ComparisonTable comparison={comparison} />
      </section>
    </div>
  );
}
