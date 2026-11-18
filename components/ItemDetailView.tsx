import Link from "next/link";
import ComparisonTable from "@/components/ComparisonTable";
import DemoDataBadge from "@/components/DemoDataBadge";
import { formatUsd } from "@/lib/format";
import { storeLabel } from "@/lib/storeLabel";
import { trustReasonsSentence } from "@/lib/trust";
import type { ItemComparison } from "@/lib/types";

export default function ItemDetailView({ comparison }: { comparison: ItemComparison }) {
  const { item, listings, stores, cheapestListingId } = comparison;
  const storeById = new Map(stores.map((s) => [s.id, s]));
  /** A listing by id with its store; the store is undefined when it is not in the response. */
  const pick = (id: string | null) => {
    const listing = listings.find((l) => l.id === id);
    return listing ? { listing, store: storeById.get(listing.storeId) } : null;
  };
  const cheapest = pick(cheapestListingId);
  const trusted = pick(comparison.cheapestTrustedListingId);
  // Demo unless the page really shows live prices: with no listings, nothing here is live (AGENTS.md section 3).
  const showDemoBadge = listings.length === 0 || listings.some((l) => l.source === "demo");
  // An unknown store cannot be checked, so it gets the same warning and trusted alternative as a low-trust one.
  const warning = !cheapest
    ? null
    : !cheapest.store
      ? "The cheapest store shown could not be checked, so its trust is unknown."
      : cheapest.store.trust.lowTrust
        ? `The cheapest store shown, ${storeLabel(cheapest.store)}, looks low-trust${
            cheapest.store.trust.reasons.length ? `: ${trustReasonsSentence(cheapest.store.trust.reasons)}` : ""
          }.`
        : null;

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
        {cheapest && (
          <p className="text-sm">
            Cheapest of the stores shown: {formatUsd(cheapest.listing.price)} at {cheapest.store ? storeLabel(cheapest.store) : "Unknown store"}
          </p>
        )}
        {warning && (
          <div
            role="note"
            aria-label="Trust warning"
            className="flex flex-col gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
          >
            <p>{warning}</p>
            <p className="font-semibold">
              {trusted?.store
                ? `Cheapest trusted store shown: ${formatUsd(trusted.listing.price)} at ${storeLabel(trusted.store)}.`
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
