import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  compareListings,
  formatPrice,
  LOW_STOCK_THRESHOLD,
  loadComparisonData,
  resolveSize,
  type ComparisonRow,
} from "@/lib/comparison";

export function generateStaticParams() {
  return [{ itemId: loadComparisonData().item.id }];
}

export async function generateMetadata(props: PageProps<"/compare/[itemId]">) {
  const { itemId } = await props.params;
  const { item } = loadComparisonData();
  return { title: itemId === item.id ? `${item.name} prices · LootLens` : "LootLens" };
}

export default async function ComparePage(props: PageProps<"/compare/[itemId]">) {
  const { itemId } = await props.params;
  const data = loadComparisonData();
  if (itemId !== data.item.id) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← LootLens
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{data.item.name}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Typical price {formatPrice(data.item.typicalPrice)}
        </p>
      </header>

      {data.demo && (
        <p
          role="note"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          {data.label}
        </p>
      )}

      <Suspense fallback={<p className="text-zinc-500">Loading prices…</p>}>
        <ComparisonResults searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function ComparisonResults({
  searchParams,
}: {
  searchParams: PageProps<"/compare/[itemId]">["searchParams"];
}) {
  const { size: requested } = await searchParams;
  const data = loadComparisonData();
  const size = resolveSize(data.item, typeof requested === "string" ? requested : undefined);
  const { item, rows, lowest, lowestNew } = compareListings(data, size);

  return (
    <>
      <nav aria-label="Size" className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Size</span>
        {item.sizes.map((s) => (
          <Link
            key={s}
            href={`/compare/${item.id}?size=${encodeURIComponent(s)}`}
            aria-current={s === size ? "page" : undefined}
            className={`rounded-md border px-3 py-1 text-sm ${
              s === size
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
            }`}
          >
            {s}
          </Link>
        ))}
      </nav>

      <section aria-label="Best prices" className="grid gap-3 sm:grid-cols-2">
        {lowest ? (
          <>
            <Highlight title="Lowest price" row={lowest} />
            {lowestNew && lowestNew !== lowest && (
              <Highlight title="Lowest new price" row={lowestNew} />
            )}
          </>
        ) : (
          <p className="text-zinc-600 dark:text-zinc-400">
            No store has size {size} in stock right now.
          </p>
        )}
      </section>

      <section aria-label="All stores">
        <h2 className="mb-2 text-lg font-semibold">All stores, size {size}</h2>
        <ol className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map((row) => (
            <StoreRow key={row.listing.id} row={row} />
          ))}
        </ol>
      </section>
    </>
  );
}

function Highlight({ title, row }: { title: string; row: ComparisonRow }) {
  return (
    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
      <p className="text-sm text-emerald-800 dark:text-emerald-300">{title}</p>
      <p className="text-2xl font-semibold">{formatPrice(row.listing.price)}</p>
      <p className="text-sm">
        {row.store.name} · {row.listing.condition}
      </p>
    </div>
  );
}

function StoreRow({ row }: { row: ComparisonRow }) {
  const { listing, store, stock, inStock, savings, savingsPercent } = row;
  return (
    <li
      className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 ${inStock ? "" : "opacity-60"}`}
    >
      <div className="min-w-0">
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium hover:underline"
        >
          {store.name}
        </a>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="capitalize">{listing.condition}</span> · {stockText(stock)} ·
          Updated <UpdatedAt iso={listing.updatedAt} />
        </p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${inStock ? "" : "line-through"}`}>
          {formatPrice(listing.price)}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {savingsText(savings, savingsPercent)}
        </p>
      </div>
    </li>
  );
}

function stockText(stock: number) {
  if (stock <= 0) return "Out of stock";
  if (stock <= LOW_STOCK_THRESHOLD) return `Only ${stock} left`;
  return "In stock";
}

function savingsText(savings: number, percent: number) {
  if (savings > 0) return `${formatPrice(savings)} below typical (${percent}%)`;
  if (savings < 0) return `${formatPrice(-savings)} above typical`;
  return "Typical price";
}

const updatedFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function UpdatedAt({ iso }: { iso: string }) {
  return <time dateTime={iso}>{updatedFormat.format(new Date(iso))}</time>;
}
