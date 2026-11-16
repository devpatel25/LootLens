"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import DemoDataBadge from "@/components/DemoDataBadge";
import EmptyState from "@/components/EmptyState";
import ItemSheet from "@/components/ItemSheet";
import WishlistCard from "@/components/WishlistCard";
import { ApiClientError, apiFetch } from "@/lib/apiClient";
import type { Item, WishlistItem } from "@/lib/types";

const primary =
  "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

/** Data comes from the server page as props; after a change we router.refresh() instead of keeping a copy. */
export default function WishlistView({ items, anyDemo }: { items: WishlistItem[]; anyDemo: boolean }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<{ item: Item | null } | null>(null);
  const [deleting, setDeleting] = useState<WishlistItem | null>(null);
  // seq gives each announcement a fresh node, so screen readers repeat a message that did not change.
  const [{ message, seq }, setAnnouncement] = useState({ message: "", seq: 0 });
  const setMessage = (text: string) => setAnnouncement((a) => ({ message: text, seq: a.seq + 1 }));
  // The button that opened the current dialog (kept from the click, since Safari does not focus it).
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  // Bumped after an add or delete: the button that opened the dialog may disappear, so focus the heading.
  const [focusHeading, setFocusHeading] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusHeading > 0) headingRef.current?.focus();
  }, [focusHeading]);

  function gone() {
    setSheet(null);
    setDeleting(null);
    setMessage("That item was already removed.");
    setFocusHeading((n) => n + 1);
    router.refresh();
  }

  const addButton = (
    <button
      type="button"
      onClick={(e) => {
        setOpener(e.currentTarget);
        setSheet({ item: null });
      }}
      className={primary}
    >
      Add item
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight focus:outline-none">
            Wishlist
          </h1>
          {anyDemo && items.length > 0 && <DemoDataBadge />}
        </div>
        {items.length > 0 && addButton}
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-emerald-800 dark:text-emerald-300">
        <span key={seq}>{message}</span>
      </p>

      {items.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          message="Add something you want to buy. LootLens shows the cheapest store that has your size."
          action={addButton}
        />
      ) : (
        <ul aria-label="Wishlist items" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onEdit={(e) => {
                setOpener(e.currentTarget);
                setSheet({ item });
              }}
              onDelete={(e) => {
                setOpener(e.currentTarget);
                setDeleting(item);
              }}
            />
          ))}
        </ul>
      )}

      <ItemSheet
        open={sheet !== null}
        item={sheet?.item ?? null}
        onClose={() => setSheet(null)}
        opener={opener}
        onMissing={gone}
        onSaved={(name) => {
          const added = !sheet?.item;
          setMessage(added ? `Added ${name}.` : `Saved ${name}.`);
          setSheet(null);
          if (added) setFocusHeading((n) => n + 1);
          router.refresh();
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? ""}?`}
        message="It leaves your wishlist with its watches and alerts. This cannot be undone."
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        opener={opener}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await apiFetch(`/api/items/${deleting.id}`, { method: "DELETE" });
          } catch (e) {
            if (e instanceof ApiClientError && e.status === 404) return gone();
            throw e;
          }
          setMessage(`Deleted ${deleting.name}.`);
          setDeleting(null);
          setFocusHeading((n) => n + 1);
          router.refresh();
        }}
      />
    </div>
  );
}
