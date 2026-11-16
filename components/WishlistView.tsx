"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import DemoDataBadge from "@/components/DemoDataBadge";
import EmptyState from "@/components/EmptyState";
import ItemSheet from "@/components/ItemSheet";
import WishlistCard from "@/components/WishlistCard";
import { apiFetch } from "@/lib/apiClient";
import type { Item, WishlistItem } from "@/lib/types";

const primary =
  "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

/** Data comes from the server page as props; after a change we router.refresh() instead of keeping a copy. */
export default function WishlistView({ items, anyDemo }: { items: WishlistItem[]; anyDemo: boolean }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<{ item: Item | null } | null>(null);
  const [deleting, setDeleting] = useState<WishlistItem | null>(null);
  const [message, setMessage] = useState("");

  const addButton = (
    <button type="button" onClick={() => setSheet({ item: null })} className={primary}>
      Add item
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Wishlist</h1>
          {anyDemo && items.length > 0 && <DemoDataBadge />}
        </div>
        {items.length > 0 && addButton}
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-emerald-800 dark:text-emerald-300">
        {message}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          message="Add something you want to buy. LootLens shows the cheapest store that has your size."
          action={addButton}
        />
      ) : (
        <ul aria-label="Wishlist items" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <WishlistCard key={item.id} item={item} onEdit={() => setSheet({ item })} onDelete={() => setDeleting(item)} />
          ))}
        </ul>
      )}

      <ItemSheet
        open={sheet !== null}
        item={sheet?.item ?? null}
        onClose={() => setSheet(null)}
        onMissing={() => {}}
        onSaved={(name) => {
          setMessage(sheet?.item ? `Saved ${name}.` : `Added ${name}.`);
          setSheet(null);
          router.refresh();
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? ""}?`}
        message="It leaves your wishlist with its watches and alerts. This cannot be undone."
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await apiFetch(`/api/items/${deleting.id}`, { method: "DELETE" });
          setMessage(`Deleted ${deleting.name}.`);
          setDeleting(null);
          router.refresh();
        }}
      />
    </div>
  );
}
