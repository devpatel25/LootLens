import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ItemDetailView from "@/components/ItemDetailView";
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
  const comparison = await loadComparison(parsed.data.id, userId);
  if (!comparison) notFound();
  return <ItemDetailView comparison={comparison} />;
}
