"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError, apiFetch, friendlyMessage } from "@/lib/apiClient";
import { announceAlertsChanged } from "@/lib/alertText";
import type { Listing } from "@/lib/types";

function waitText(seconds?: number): string {
  if (!seconds) return "a few minutes";
  return seconds < 60 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`;
}

/** POST /api/items/[id]/refresh, then router.refresh() so the server re-renders the comparison. */
export default function RefreshButton({ itemId, listings }: { itemId: string; listings: Listing[] }) {
  void listings;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMessage("");
    setError(null);
    try {
      const { alertsCreated } = await apiFetch<{ alertsCreated: number }>(`/api/items/${itemId}/refresh`, { method: "POST" });
      setMessage(
        alertsCreated === 0 ? "Prices updated." : `Prices updated. ${alertsCreated} new ${alertsCreated === 1 ? "alert" : "alerts"}.`,
      );
      router.refresh();
      announceAlertsChanged();
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 429) {
        setMessage(`Prices were refreshed a moment ago. Try again in ${waitText(e.retryAfterSeconds)}.`);
      } else {
        setError(friendlyMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
      >
        {busy ? "Refreshing…" : "Refresh now"}
      </button>
      <p role="status" aria-live="polite" className="text-right text-xs text-zinc-700 dark:text-zinc-300">
        {message}
      </p>
      {error && (
        <p role="alert" className="text-right text-xs font-medium text-red-800 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
