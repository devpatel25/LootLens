import EmptyState from "@/components/EmptyState";
import { chip as tag } from "@/components/styles";
import { formatUsd } from "@/lib/format";
import { sortForComparison, stockInSize } from "@/lib/pricing";
import { needsFictionalLabel, storeLabel } from "@/lib/storeLabel";
import { trustReasonsSentence } from "@/lib/trust";
import type { ItemComparison, ListingCondition } from "@/lib/types";

const CONDITION: Record<ListingCondition, { label: string; className: string }> = {
  new: { label: "New", className: "border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300" },
  used: { label: "Used", className: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100" },
  resale: {
    label: "Resale",
    className: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100",
  },
};


export default function ComparisonTable({ comparison }: { comparison: ItemComparison }) {
  const { item, stores, listings, cheapestListingId } = comparison;
  const size = item.selectedSize;

  if (listings.length === 0) {
    return <EmptyState headingLevel={3} title="No store prices yet" message="Prices for this item show here once a store lists it." />;
  }

  const storeById = new Map(stores.map((s) => [s.id, s]));
  const captionId = `comparison-${item.id}`;
  const caption = `Prices for ${item.name} at every store`;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {cheapestListingId === null && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          No store shown has size {size} in stock.
        </p>
      )}
      <div
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
        className="relative overflow-x-auto rounded-xl border border-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-zinc-800"
      >
        <table className="w-full min-w-[56rem] text-left text-sm">
          <caption id={captionId} className="sr-only">
            {caption}
          </caption>
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Store</th>
              <th scope="col" className="px-4 py-3 font-semibold">Seller</th>
              <th scope="col" className="px-4 py-3 font-semibold">Condition</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Price</th>
              <th scope="col" className="px-4 py-3 font-semibold">Size {size} stock</th>
              <th scope="col" className="px-4 py-3 font-semibold">Trust</th>
              <th scope="col" className="px-4 py-3 font-semibold">Source</th>
              <th scope="col" className="px-4 py-3 font-semibold">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sortForComparison(listings, stores).map((listing) => {
              const store = storeById.get(listing.storeId);
              const name = store?.name ?? "Unknown store";
              const stock = stockInSize(listing, size);
              const cheapest = listing.id === cheapestListingId;
              const condition = CONDITION[listing.condition];
              return (
                <tr key={listing.id} className={cheapest ? "bg-emerald-50/60 dark:bg-emerald-950/40" : undefined}>
                  <th scope="row" className="px-4 py-3 font-medium">
                    <span className="flex flex-wrap items-center gap-2">
                      {name}
                      {store && needsFictionalLabel(store) && (
                        <span className={`${tag} border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100`}>
                          Fictional
                        </span>
                      )}
                      {store?.trust.lowTrust && (
                        <span className={`${tag} border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100`}>
                          <svg aria-hidden="true" viewBox="0 0 16 16" className="mr-1 size-3 fill-current">
                            <path d="M8 1 15 14H1L8 1Zm-.75 5v4h1.5V6h-1.5Zm0 5v1.5h1.5V11h-1.5Z" />
                          </svg>
                          Low-trust
                        </span>
                      )}
                      {cheapest && (
                        <span className={`${tag} border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950`}>
                          Cheapest
                        </span>
                      )}
                    </span>
                  </th>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{store?.sellerName ?? "Unknown seller"}</td>
                  <td className="px-4 py-3">
                    <span className={`${tag} ${condition.className}`}>{condition.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatUsd(listing.price)}</td>
                  <td className="px-4 py-3">
                    {stock > 0 ? (
                      <span>{stock} in stock</span>
                    ) : (
                      <span className="font-medium text-red-800 dark:text-red-300">Out of stock</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!store ? (
                      <span className="font-medium text-amber-900 dark:text-amber-200">Trust unknown</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className={store.isHttps ? "text-zinc-700 dark:text-zinc-300" : "font-medium text-red-800 dark:text-red-300"}>
                          {store.isHttps ? "HTTPS" : "No HTTPS"}
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {store.photoReviewCount} {store.photoReviewCount === 1 ? "photo review" : "photo reviews"}
                        </span>
                        {store.trust.lowTrust && store.trust.reasons.length > 0 && (
                          <span className="text-xs text-red-900 dark:text-red-200">
                            {trustReasonsSentence(store.trust.reasons, { capitalize: true })}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{listing.source === "demo" ? "Demo" : "Live"}</td>
                  <td className="px-4 py-3">
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
                    >
                      View at {store ? storeLabel(store) : name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
