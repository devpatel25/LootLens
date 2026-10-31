import { notFound } from "next/navigation";
import ComparisonTable from "@/components/ComparisonTable";
import DemoDataBadge from "@/components/DemoDataBadge";
import { demoItemIds, getDemoComparison } from "@/lib/demoData";

export function generateStaticParams() {
  return demoItemIds().map((id) => ({ id }));
}

export default async function ItemDetailPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const comparison = getDemoComparison(id);
  if (!comparison) notFound();

  const isDemo = comparison.listings.some((listing) => listing.source === "demo");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{comparison.item.name}</h1>
          {isDemo && <DemoDataBadge />}
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">Saved size: {comparison.item.selectedSize}</p>
        {isDemo && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Prices and stock on this page are made up for testing. They are not live store prices.
          </p>
        )}
      </header>
      <section aria-labelledby="compare-heading" className="flex flex-col gap-3">
        <h2 id="compare-heading" className="text-lg font-semibold">
          Compare stores
        </h2>
        <ComparisonTable comparison={comparison} />
      </section>
    </main>
  );
}
