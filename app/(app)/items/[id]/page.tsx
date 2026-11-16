import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ItemDetailView from "@/components/ItemDetailView";
import { loadComparison } from "@/lib/comparison";
import { requirePageUserId } from "@/lib/currentUser";
import { idParams } from "@/lib/itemSchema";
import Loading from "./loading";

export const metadata: Metadata = { title: "Item" };

async function ItemDetail({ params }: { params: PageProps<"/items/[id]">["params"] }) {
  const raw = await params;
  const userId = await requirePageUserId(`/items/${encodeURIComponent(raw.id)}`);
  const parsed = idParams.safeParse(raw);
  if (!parsed.success) notFound();
  const comparison = await loadComparison(parsed.data.id, userId);
  if (!comparison) notFound();
  return <ItemDetailView comparison={comparison} />;
}

export default function ItemPage({ params }: PageProps<"/items/[id]">) {
  return (
    // Same fallback as loading.tsx, from one place.
    <Suspense fallback={<Loading />}>
      <ItemDetail params={params} />
    </Suspense>
  );
}
