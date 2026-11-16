import Link from "next/link";
import { formatUsd } from "@/lib/format";
import { storeLabel } from "@/lib/storeLabel";
import type { ItemComparison } from "@/lib/types";

/** A discount amount: the minus sign is hidden from screen readers, which say "minus" instead. */
function Minus({ amount }: { amount: number }) {
  return (
    <>
      <span aria-hidden="true">{"\u2212"}</span>
      <span className="sr-only">minus </span>
      {formatUsd(amount)}
    </>
  );
}

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
      {!bestDeal ? (
        <p className="text-sm">No store shown has size {item.selectedSize} in stock, so there is no best deal yet.</p>
      ) : !store ? (
        <p className="text-sm">The best deal could not be shown. Refresh the page to try again.</p>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span>
              Best total of the stores shown: {formatUsd(bestDeal.total)} at {storeLabel(store)}
            </span>
            {store.trust.lowTrust && (
              <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                Low-trust
              </span>
            )}
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
                  {bestDeal.code ? <Minus amount={bestDeal.code.discount} /> : "No code applies"}
                </td>
              </tr>
              <tr className={row}>
                <th scope="row" className="py-1.5 text-left font-normal">
                  Cashback
                  {bestDeal.cashback && ` ${bestDeal.cashback.provider} ${bestDeal.cashback.ratePct}%`}
                </th>
                <td className="py-1.5 text-right tabular-nums">
                  {bestDeal.cashback ? <Minus amount={bestDeal.cashback.amount} /> : "No cashback"}
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
          <p className="text-xs text-zinc-600 dark:text-zinc-300">Amounts are rounded to the cent, so the lines may not add up exactly.</p>
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
