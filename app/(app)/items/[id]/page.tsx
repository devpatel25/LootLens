import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ItemDetailView from "@/components/ItemDetailView";
import RefreshButton from "@/components/RefreshButton";
import WatchPanel from "@/components/WatchPanel";
import { loadItemWatches } from "@/lib/alertsData";
import { loadComparison } from "@/lib/comparison";
import { requirePageUserId } from "@/lib/currentUser";
import { idParams } from "@/lib/itemSchema";
import { itemPagePath } from "@/lib/paths";

export const metadata: Metadata = { title: "Item" };

// loading.tsx is the <Suspense> boundary for this page, so the session read below streams behind it.
export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const raw = await params;
  const userId = await requirePageUserId(itemPagePath(raw.id));
  const parsed = idParams.safeParse(raw);
  if (!parsed.success) notFound();
  // Both at once: the watches do not need the comparison, only the item id.
  const [comparison, watches] = await Promise.all([loadComparison(parsed.data.id, userId), loadItemWatches(userId, parsed.data.id)]);
  if (!comparison) notFound();
  const { item, listings, cheapestListingId } = comparison;
  const watch = watches.find((w) => w.size === item.selectedSize) ?? null;
  const cheapestPrice = listings.find((l) => l.id === cheapestListingId)?.price ?? null;
  return (
    <ItemDetailView
      comparison={comparison}
      refresh={<RefreshButton itemId={item.id} />}
      watchPanel={<WatchPanel item={item} watch={watch} cheapestPrice={cheapestPrice} />}
    />
  );
}
