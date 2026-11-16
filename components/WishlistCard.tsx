import Link from "next/link";
import { formatUsd } from "@/lib/format";
import { CATEGORIES } from "@/lib/itemForm";
import type { WishlistItem } from "@/lib/types";

const button =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-zinc-600 dark:hover:bg-zinc-800";

export default function WishlistCard({ item, onEdit, onDelete }: { item: WishlistItem; onEdit: () => void; onDelete: () => void }) {
  const category = CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold [overflow-wrap:anywhere]">
          <Link
            href={`/items/${item.id}`}
            className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {item.name}
          </Link>
        </h2>
        <p className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <span>{category}</span>
          <span aria-hidden="true">·</span>
          <span>Size {item.selectedSize}</span>
        </p>
      </div>
      {item.cheapest ? (
        <p className="text-sm font-medium">
          Cheapest: {formatUsd(item.cheapest.price)} at {item.cheapest.storeName}
        </p>
      ) : (
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">No store shown has size {item.selectedSize} in stock</p>
      )}
      <div className="mt-auto flex gap-2">
        <button type="button" onClick={onEdit} aria-label={`Edit ${item.name}`} className={button}>
          Edit
        </button>
        <button type="button" onClick={onDelete} aria-label={`Delete ${item.name}`} className={`${button} text-red-800 dark:text-red-300`}>
          Delete
        </button>
      </div>
    </li>
  );
}
