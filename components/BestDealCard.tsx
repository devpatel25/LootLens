import Link from "next/link";
import { formatUsd } from "@/lib/format";
import { storeLabel } from "@/lib/trust";
import type { ItemComparison } from "@/lib/types";

const MINUS = "−";

/** Every number comes from comparison.bestDeal (lib/pricing bestDeal); nothing is computed here. */
export default function BestDealCard({ comparison }: { comparison: ItemComparison }) {
  const { bestDeal, listings, stores, item } = comparison;
  const listing = bestDeal && listings.find((l) => l.id === bestDeal.listingId);
  const store = listing && stores.find((s) => s.id === listing.storeId);
  const row = "border-t border-zinc-200 dark:border-zinc-700";

  return (
    <section
      aria-labelledby="best-deal-heading"
      className="flex flex-col gap-3 rounded-xl border border-emerald-700/30 bg-emerald-50/50 p-4 dark:border-emerald-400/30 dark:bg-emerald-950/30"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="best-deal-heading" className="text-lg font-semibold">
          Best deal
        </h2>
        <Link
          href="/settings"
          className="text-sm font-medium text-emerald-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-emerald-300"
        >
          Code settings
        </Link>
      </div>
      {!bestDeal || !store ? (
        <p className="text-sm">No store shown has size {item.selectedSize} in stock, so there is no best deal yet.</p>
      ) : (
        <>
          <p className="text-sm font-medium">
            Best total of the stores shown: {formatUsd(bestDeal.total)} at {storeLabel(store)}
          </p>
          <table className="w-full max-w-sm text-sm">
            <caption className="sr-only">How the best total adds up</caption>
            <tbody>
              <tr>
                <th scope="row" className="py-1.5 text-left font-normal">
                  Price
                </th>
                <td className="py-1.5 text-right tabular-nums">{formatUsd(bestDeal.price)}</td>
              </tr>
              <tr className={row}>
                <th scope="row" className="py-1.5 text-left font-normal">
                  Code{bestDeal.code && <> <span className="font-mono font-semibold">{bestDeal.code.code}</span></>}
                </th>
                <td className="py-1.5 text-right tabular-nums">
                  {bestDeal.code ? `${MINUS}${formatUsd(bestDeal.code.discount)}` : "No code applies"}
                </td>
              </tr>
              <tr className={row}>
                <th scope="row" className="py-1.5 text-left font-normal">
                  Cashback
                  {bestDeal.cashback && ` ${bestDeal.cashback.provider} ${bestDeal.cashback.ratePct}%`}
                </th>
                <td className="py-1.5 text-right tabular-nums">
                  {bestDeal.cashback ? `${MINUS}${formatUsd(bestDeal.cashback.amount)}` : "No cashback"}
                </td>
              </tr>
              <tr className="border-t-2 border-zinc-400 dark:border-zinc-500">
                <th scope="row" className="py-1.5 text-left font-semibold">
                  Total
                </th>
                <td className="py-1.5 text-right text-base font-bold tabular-nums">{formatUsd(bestDeal.total)}</td>
              </tr>
            </tbody>
          </table>
          {bestDeal.cashback && (
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Cashback is paid back later by {bestDeal.cashback.provider}, not taken off at checkout.
            </p>
          )}
        </>
      )}
    </section>
  );
}
