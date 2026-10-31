import { cheapestListing, sortByPrice, stockInSize } from "@/lib/pricing";
import type { ItemComparison, ListingCondition } from "@/lib/types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const conditionLabels: Record<ListingCondition, string> = {
  new: "New",
  used: "Used",
  resale: "Resale",
};

export default function ComparisonTable({ comparison }: { comparison: ItemComparison }) {
  const { item, stores, listings } = comparison;
  const size = item.selectedSize;

  if (listings.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No stores list this item yet.</p>;
  }

  const cheapest = cheapestListing(listings, size);
  const storeById = new Map(stores.map((store) => [store.id, store]));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {cheapest
          ? `Cheapest marks the lowest price among the stores shown with size ${size} in stock.`
          : `No store shown has size ${size} in stock.`}
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="px-4 py-3 text-left font-medium">
            {item.name} prices at each store, size {size}
          </caption>
          <thead className="bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Store</th>
              <th scope="col" className="px-4 py-2 font-medium">Condition</th>
              <th scope="col" className="px-4 py-2 font-medium">Price</th>
              <th scope="col" className="px-4 py-2 font-medium">Size {size} stock</th>
              <th scope="col" className="px-4 py-2 font-medium">Source</th>
              <th scope="col" className="px-4 py-2 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {sortByPrice(listings).map((listing) => {
              const store = storeById.get(listing.storeId);
              const storeName = store?.name ?? listing.storeId;
              const stock = stockInSize(listing, size);
              const isCheapest = listing.id === cheapest?.id;
              return (
                <tr
                  key={listing.id}
                  className={`border-t border-zinc-200 dark:border-zinc-800 ${
                    isCheapest ? "bg-emerald-50 dark:bg-emerald-950" : ""
                  }`}
                >
                  <th scope="row" className="px-4 py-3 font-medium">
                    {storeName}
                    {store && (
                      <span className="block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                        {store.domain}
                      </span>
                    )}
                  </th>
                  <td className="px-4 py-3">
                    {listing.condition === "new" ? (
                      conditionLabels.new
                    ) : (
                      <span className="rounded border border-zinc-400 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:border-zinc-500 dark:text-zinc-200">
                        {conditionLabels[listing.condition]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold tabular-nums">{usd.format(listing.price)}</span>
                    {isCheapest && (
                      <span className="ml-2 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                        Cheapest
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{stock > 0 ? `${stock} in stock` : "Out of stock"}</td>
                  <td className="px-4 py-3">{listing.source === "demo" ? "Demo" : "Live"}</td>
                  <td className="px-4 py-3">
                    <a
                      href={listing.url}
                      aria-label={`View ${storeName} listing`}
                      className="font-medium text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-blue-300"
                    >
                      View
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
