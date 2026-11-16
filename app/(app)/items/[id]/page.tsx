import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ItemDetailView from "@/components/ItemDetailView";
import LoadingState from "@/components/LoadingState";
import { loadComparison } from "@/lib/comparison";
import { requirePageUserId } from "@/lib/currentUser";
import { idParams } from "@/lib/itemSchema";

export const metadata: Metadata = { title: "Item" };

async function ItemDetail({ params }: { params: PageProps<"/items/[id]">["params"] }) {
  const userId = await requirePageUserId();
  const parsed = idParams.safeParse(await params);
  if (!parsed.success) notFound();
  const comparison = await loadComparison(parsed.data.id, userId);
  if (!comparison) notFound();
  return <ItemDetailView comparison={comparison} />;
}

export default function ItemPage({ params }: PageProps<"/items/[id]">) {
  return (
    <Suspense fallback={<LoadingState label="Loading prices" />}>
      <ItemDetail params={params} />
    </Suspense>
  );
}
