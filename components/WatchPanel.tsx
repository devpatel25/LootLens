"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ApiClientError, apiFetch, friendlyMessage } from "@/lib/apiClient";
import { announceAlertsChanged, watchSummary } from "@/lib/alertText";
import { formatUsd } from "@/lib/format";
import { moneySchema } from "@/lib/itemSchema";
import type { Item, Watch } from "@/lib/types";

export type WatchPanelProps = { item: Item; watch: Watch | null; cheapestPrice: number | null };

const input =
  "w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 disabled:opacity-50 aria-[invalid=true]:border-red-700 dark:border-zinc-600 dark:bg-zinc-800";
const button =
  "w-fit rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60";

export default function WatchPanel({ item, watch, cheapestPrice }: WatchPanelProps) {
  const router = useRouter();
  const uid = useId();
  const size = item.selectedSize;
  const [mode, setMode] = useState<"any" | "target">("any");
  const [target, setTarget] = useState("");
  const [lowStock, setLowStock] = useState("3");
  const [errors, setErrors] = useState<{ target?: string; lowStock?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const noStock = `No store has size ${size} in stock right now, so there is no price to watch.`;
  const apiErrors: Record<string, string> = {
    watch_exists: `You already watch this item in size ${size}.`,
    watch_limit: "You can watch up to 10 items. Delete one on the Alerts page first.",
    no_listing: noStock,
  };

  async function create(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setMessage("");
    const next: typeof errors = {};
    let targetPrice: number | null = null;
    if (mode === "target") {
      const n = target.trim() === "" ? Number.NaN : Number(target);
      if (!moneySchema.safeParse(n).success) next.target = "Enter a target price like 49.99.";
      else if (cheapestPrice !== null && n >= cheapestPrice) next.target = `Pick a target below today's cheapest price, ${formatUsd(cheapestPrice)}.`;
      else targetPrice = n;
    }
    const low = /^\d+$/.test(lowStock.trim()) ? Number(lowStock) : Number.NaN;
    if (!(low >= 0 && low <= 50)) next.lowStock = "Enter a whole number from 0 to 50.";
    setErrors(next);
    if (next.target || next.lowStock) {
      document.getElementById(next.target ? `${uid}-target` : `${uid}-low`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/watches", { method: "POST", json: { itemId: item.id, size, targetPrice, lowStockAt: low } });
      setMessage(`Watching size ${size}.`);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof ApiClientError && apiErrors[err.code] ? apiErrors[err.code] : friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby={`${uid}-title`}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 id={`${uid}-title`} className="text-lg font-semibold">
        Price watch
      </h2>

      {watch ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{watchSummary(watch)}</p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`${button} border border-zinc-300 text-red-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-red-300 dark:hover:bg-zinc-800`}
          >
            Delete watch
          </button>
        </div>
      ) : cheapestPrice === null ? (
        <p className="text-sm">{noStock}</p>
      ) : (
        <form onSubmit={create} noValidate className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Alert me about the price in size {size}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name={`${uid}-mode`} checked={mode === "any"} onChange={() => setMode("any")} className="accent-emerald-700" />
              Any price drop
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${uid}-mode`}
                checked={mode === "target"}
                onChange={() => setMode("target")}
                className="accent-emerald-700"
              />
              At or below a target price
            </label>
            <div className="flex flex-col gap-1 pl-6">
              <label htmlFor={`${uid}-target`} className="text-sm">
                Target price (USD)
              </label>
              <input
                id={`${uid}-target`}
                className={input}
                inputMode="decimal"
                autoComplete="off"
                disabled={mode !== "target"}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                aria-invalid={errors.target ? true : undefined}
                aria-describedby={errors.target ? `${uid}-target-error` : undefined}
              />
              {errors.target && (
                <p id={`${uid}-target-error`} className="text-xs font-medium text-red-800 dark:text-red-300">
                  {errors.target}
                </p>
              )}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-low`} className="text-sm font-medium">
              Low-stock alert at
            </label>
            <input
              id={`${uid}-low`}
              className={input}
              inputMode="numeric"
              autoComplete="off"
              value={lowStock}
              onChange={(e) => setLowStock(e.target.value)}
              aria-invalid={errors.lowStock ? true : undefined}
              aria-describedby={errors.lowStock ? `${uid}-low-error` : `${uid}-low-hint`}
            />
            {errors.lowStock ? (
              <p id={`${uid}-low-error`} className="text-xs font-medium text-red-800 dark:text-red-300">
                {errors.lowStock}
              </p>
            ) : (
              <p id={`${uid}-low-hint`} className="text-xs text-zinc-600 dark:text-zinc-400">
                Alert when this many or fewer are left in size {size}. 0 alerts only when it sells out.
              </p>
            )}
          </div>
          {formError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              {formError}
            </p>
          )}
          <button type="submit" disabled={busy} className={`${button} bg-emerald-700 text-white hover:bg-emerald-800`}>
            {busy ? "Saving…" : "Watch this item"}
          </button>
        </form>
      )}

      <p role="status" aria-live="polite" className="text-sm text-emerald-800 dark:text-emerald-300">
        {message}
      </p>

      <ConfirmDialog
        open={confirming && watch !== null}
        title="Delete this watch?"
        message={`You will stop getting alerts for size ${watch?.size ?? size}.`}
        confirmLabel="Delete"
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          if (!watch) return;
          try {
            await apiFetch(`/api/watches/${watch.id}`, { method: "DELETE" });
          } catch (e) {
            // Already gone (deleted on the Alerts page or another tab): same result for the shopper.
            if (!(e instanceof ApiClientError && e.status === 404)) throw e;
          }
          setConfirming(false);
          setMessage("Watch deleted.");
          router.refresh();
          announceAlertsChanged();
        }}
      />
    </section>
  );
}
