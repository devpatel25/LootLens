"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError, apiFetch, friendlyMessage } from "@/lib/apiClient";
import { announceAlertsChanged } from "@/lib/alertText";
import type { RefreshResult } from "@/lib/types";

function waitText(seconds?: number): string {
  if (!seconds) return "a few minutes";
  if (seconds < 60) return seconds === 1 ? "1 second" : `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/** POST /api/items/[id]/refresh, then router.refresh() so the server re-renders the comparison. */
export default function RefreshButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // seq gives each announcement a fresh node, so a repeated message is announced again.
  const [{ message, seq }, setAnnouncement] = useState({ message: "", seq: 0 });
  const setMessage = (text: string) => setAnnouncement((a) => ({ message: text, seq: a.seq + 1 }));
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMessage("");
    setError(null);
    try {
      // The server counts what this refresh changed, so the message never compares against stale props.
      const { alertsCreated, listingsChanged } = await apiFetch<RefreshResult>(`/api/items/${itemId}/refresh`, { method: "POST" });
      const alerts = alertsCreated > 0 ? ` ${alertsCreated} new ${alertsCreated === 1 ? "alert" : "alerts"}.` : "";
      setMessage(listingsChanged > 0 ? `Prices updated.${alerts}` : alerts ? `Prices checked.${alerts}` : "Prices checked. Nothing changed.");
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
        <span key={seq}>{message}</span>
      </p>
      {error && (
        <p role="alert" className="text-right text-xs font-medium text-red-800 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
