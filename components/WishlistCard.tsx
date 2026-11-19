import Link from "next/link";
import type { MouseEvent } from "react";
import { formatUsd } from "@/lib/format";
import { CATEGORIES } from "@/lib/itemForm";
import { storeLabel } from "@/lib/storeLabel";
import type { WishlistItem } from "@/lib/types";
import { CONDITION_TAG, chip, smallButton } from "@/components/styles";

type Handler = (e: MouseEvent<HTMLButtonElement>) => void;

export default function WishlistCard({ item, onEdit, onDelete }: { item: WishlistItem; onEdit: Handler; onDelete: Handler }) {
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
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">
            Cheapest of the stores shown: {formatUsd(item.cheapest.price)} at {storeLabel({ name: item.cheapest.storeName, fictional: item.cheapest.fictional })}
          </p>
          <p className="flex flex-wrap gap-1.5">
            {item.cheapest.condition !== "new" && (
              <span className={`${chip} ${CONDITION_TAG[item.cheapest.condition].className}`}>{CONDITION_TAG[item.cheapest.condition].label}</span>
            )}
            {item.cheapest.lowTrust && (
              <span className={`${chip} border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100`}>Low-trust</span>
            )}
            {item.cheapest.source === "demo" && (
              <span className={`${chip} border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300`}>Demo</span>
            )}
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">No store shown has size {item.selectedSize} in stock</p>
      )}
      <div className="mt-auto flex gap-2">
        <button type="button" onClick={onEdit} aria-label={`Edit ${item.name}`} className={smallButton}>
          Edit
        </button>
        <button type="button" onClick={onDelete} aria-label={`Delete ${item.name}`} className={`${smallButton} text-red-800 dark:text-red-300`}>
          Delete
        </button>
      </div>
    </li>
  );
}
