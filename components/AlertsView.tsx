"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import DemoDataBadge from "@/components/DemoDataBadge";
import EmptyState from "@/components/EmptyState";
import { smallButton } from "@/components/styles";
import type { WatchWithItem } from "@/lib/alertsData";
import { ApiClientError, apiFetch, friendlyMessage } from "@/lib/apiClient";
import { alertText, announceAlertsChanged, POLL_MS, watchSummary } from "@/lib/alertText";
import { ago } from "@/lib/format";
import type { AlertsResponse } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { useVisiblePoll } from "@/lib/useVisiblePoll";
import { useAnnouncement } from "@/lib/useAnnouncement";

export type AlertsViewProps = { data: AlertsResponse; watches: WatchWithItem[]; now: string; anyDemo: boolean };


/** Alerts come from the server page. Polling is router.refresh() every 60s, so the server stays the only copy. */
export default function AlertsView({ data, watches, now: serverNow, anyDemo }: AlertsViewProps) {
  const router = useRouter();
  const now = useNow(serverNow);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WatchWithItem | null>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const [{ message, seq }, setMessage] = useAnnouncement();
  const [error, setError] = useState<string | null>(null);
  // From the database count, so the button shows even when the read alerts are older than the 200 loaded.
  const anyRead = data.readCount > 0;

  // Re-read from the server every 60s while the tab is visible, and catch up when it is shown again.
  useVisiblePoll(() => router.refresh(), POLL_MS);
  // When this page's data brings a new unread count (after an action or a poll), the nav badge takes it from
  // here instead of re-reading. Nothing is sent on mount or for the same count: a page that Next keeps alive
  // and shows again re-runs this effect with its old data, and must not send that old count.
  const sentCount = useRef(data.unreadCount);
  useEffect(() => {
    if (data.unreadCount === sentCount.current) return;
    sentCount.current = data.unreadCount;
    announceAlertsChanged(data.unreadCount);
  }, [data.unreadCount]);

  async function run(key: string, action: () => Promise<string | void>) {
    setBusy(key);
    setError(null);
    try {
      const done = await action();
      if (done) setMessage(done);
      router.refresh();
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          {anyDemo && (data.groups.length > 0 || watches.length > 0) && <DemoDataBadge />}
          {data.unreadCount > 0 && <span className="text-sm font-medium">{data.unreadCount} unread</span>}
        </div>
        {anyRead && (
          <button
            type="button"
            className={smallButton}
            disabled={busy !== null}
            onClick={() =>
              run("clear", async () => {
                const { deleted } = await apiFetch<{ deleted: number }>("/api/alerts/clear", { method: "POST" });
                return `Cleared ${deleted} read ${deleted === 1 ? "alert" : "alerts"}.`;
              })
            }
          >
            Clear read alerts
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className="-my-4 min-h-5 text-sm text-emerald-800 dark:text-emerald-300">
        <span key={seq}>{message}</span>
      </p>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          {error}
        </p>
      )}

      {data.groups.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          message="Set a price watch on an item's page. Price drops and low stock in your size show here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {data.groups.map((g) => (
            <section
              key={g.itemId}
              aria-labelledby={`alerts-${g.itemId}`}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`alerts-${g.itemId}`} className="text-base font-semibold [overflow-wrap:anywhere]">
                  <Link href={`/items/${g.itemId}`} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                    {g.itemName}
                  </Link>
                </h2>
                {g.unread > 0 && <span className="text-sm text-zinc-700 dark:text-zinc-300">{g.unread} unread</span>}
              </div>
              <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                {g.alerts.map((a) => {
                  const text = alertText(a);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {!a.read && (
                          <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-emerald-950">
                            New
                          </span>
                        )}
                        <span className={a.read ? "text-zinc-600 dark:text-zinc-400" : "font-medium"}>{text}</span>
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">{ago(a.createdAt, now)}</span>
                      </div>
                      <button
                        type="button"
                        className={smallButton}
                        disabled={busy !== null}
                        aria-label={`${a.read ? "Mark unread" : "Mark read"}: ${text}`}
                        onClick={() => run(a.id, async () => void (await apiFetch(`/api/alerts/${a.id}`, { method: "PATCH", json: { read: !a.read } })))}
                      >
                        {a.read ? "Mark unread" : "Mark read"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section aria-labelledby="active-watches" className="flex flex-col gap-3">
        <h2 id="active-watches" className="text-lg font-semibold">
          Active watches
        </h2>
        {watches.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">No active watches.</p>
        ) : (
          <ul aria-label="Active watches" className="flex flex-col gap-2">
            {watches.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex min-w-0 flex-col">
                  <Link href={`/items/${w.itemId}`} className="font-medium [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                    {w.itemName}
                  </Link>
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">{watchSummary(w)}</span>
                </div>
                <button
                  type="button"
                  className={`${smallButton} text-red-800 dark:text-red-300`}
                  disabled={busy !== null}
                  aria-label={`Delete watch for ${w.itemName}`}
                  onClick={(e) => {
                    setOpener(e.currentTarget);
                    setDeleting(w);
                  }}
                >
                  Delete watch
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete the watch for ${deleting?.itemName ?? ""}?`}
        message="You will stop getting new alerts for it. Alerts you already have stay until you clear them."
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        opener={opener}
        onConfirm={async () => {
          if (!deleting) return;
          const name = deleting.itemName;
          try {
            await apiFetch(`/api/watches/${deleting.id}`, { method: "DELETE" });
          } catch (e) {
            if (!(e instanceof ApiClientError && e.status === 404)) throw e;
          }
          setDeleting(null);
          setMessage(`Deleted the watch for ${name}.`);
          router.refresh();
        }}
      />
    </div>
  );
}
