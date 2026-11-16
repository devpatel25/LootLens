import Link from "next/link";
import ComparisonTable from "@/components/ComparisonTable";
import DemoDataBadge from "@/components/DemoDataBadge";
import { formatUsd } from "@/lib/format";
import { storeLabel } from "@/lib/storeLabel";
import { trustReasonsSentence } from "@/lib/trust";
import type { ItemComparison } from "@/lib/types";

export default function ItemDetailView({ comparison }: { comparison: ItemComparison }) {
  const { item, listings, stores, cheapestListingId } = comparison;
  const cheapest = listings.find((l) => l.id === cheapestListingId);
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const cheapestStore = cheapest && storeById.get(cheapest.storeId);
  // Demo unless the page really shows live prices: with no listings, nothing here is live (AGENTS.md section 3).
  const showDemoBadge = listings.length === 0 || listings.some((l) => l.source === "demo");
  const trusted = listings.find((l) => l.id === comparison.cheapestTrustedListingId);
  const trustedStore = trusted && storeById.get(trusted.storeId);

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
          {showDemoBadge && <DemoDataBadge />}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Saved size: {item.selectedSize}</p>
        {cheapest && cheapestStore && (
          <p className="text-sm">
            Cheapest of the stores shown: {formatUsd(cheapest.price)} at {storeLabel(cheapestStore)}
          </p>
        )}
        {cheapestStore?.trust.lowTrust && (
          <div
            role="note"
            aria-label="Trust warning"
            className="flex flex-col gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
          >
            <p>
              The cheapest store shown, {storeLabel(cheapestStore)}, looks low-trust: {trustReasonsSentence(cheapestStore.trust.reasons)}.
            </p>
            <p className="font-semibold">
              {trusted && trustedStore
                ? `Cheapest trusted store shown: ${formatUsd(trusted.price)} at ${storeLabel(trustedStore)}.`
                : `No trusted store shown has size ${item.selectedSize} in stock.`}
            </p>
          </div>
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
