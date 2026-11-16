"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import CodeCard from "@/components/CodeCard";
import DemoDataBadge from "@/components/DemoDataBadge";
import EmptyState from "@/components/EmptyState";
import { apiFetch, friendlyMessage } from "@/lib/apiClient";
import { CODES_ARE_DEMO, codeState } from "@/lib/codeStatus";
import type { Code } from "@/lib/types";

export type CodesViewProps = { codes: Code[]; showDead: boolean; freshnessHours: number; now: string };

type Mark = { status: "live" | "dead"; at: string };

const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 dark:border-zinc-600 dark:bg-zinc-800";

/** Codes come from the server page. A mark is shown at once (optimistic), saved, then router.refresh() reloads. */
export default function CodesView({ codes, showDead, freshnessHours, now }: CodesViewProps) {
  const router = useRouter();
  const uid = useId();
  const [query, setQuery] = useState("");
  const [store, setStore] = useState("");
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The box flips at once; the list follows when the server answers (the page remounts this view per mode).
  const [showDeadBox, setShowDeadBox] = useState(showDead);
  const [switching, startSwitch] = useTransition();

  const nowDate = new Date(now);
  const shown = codes.map((c) => {
    const m = marks[c.id];
    const code = m ? { ...c, status: m.status, lastCheckedAt: m.at } : c;
    return { code, state: codeState(code, freshnessHours, nowDate) };
  });
  const stores = [...new Set(codes.map((c) => c.storeName))].sort((a, b) => a.localeCompare(b));
  const q = query.trim().toLowerCase();
  const visible = shown.filter(
    ({ code, state }) =>
      (showDead || state === "live") &&
      (!store || code.storeName === store) &&
      (!q || [code.code, code.label, code.storeName].some((t) => t.toLowerCase().includes(q))),
  );

  async function mark(code: Code, status: "live" | "dead") {
    setError(null);
    setMarks((m) => ({ ...m, [code.id]: { status, at: now } }));
    setPending((p) => new Set(p).add(code.id));
    try {
      await apiFetch(`/api/codes/${code.id}`, { method: "PATCH", json: { status } });
      setMessage(`Marked ${code.code} ${status === "dead" ? "dead" : "alive"}.`);
      router.refresh();
    } catch (e) {
      setMarks((m) => {
        const next = { ...m };
        delete next[code.id];
        return next;
      });
      setError(friendlyMessage(e));
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(code.id);
        return next;
      });
    }
  }

  const filtersOn = q !== "" || store !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Codes</h1>
          {CODES_ARE_DEMO && codes.length > 0 && <DemoDataBadge />}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {showDead
            ? "All codes, including dead, expired, and not recently checked."
            : `Codes checked in the last ${freshnessHours} hours that still work.`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-q`} className="text-sm font-medium">
            Search codes
          </label>
          <input id={`${uid}-q`} type="search" className={input} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-store`} className="text-sm font-medium">
            Store
          </label>
          <select id={`${uid}-store`} className={input} value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 py-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={showDeadBox}
            onChange={(e) => {
              const on = e.target.checked;
              setShowDeadBox(on);
              startSwitch(() => router.push(on ? "/codes?showDead=true" : "/codes"));
            }}
            className="size-4 accent-emerald-700"
          />
          Show dead codes
          {switching && <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">Loading…</span>}
        </label>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm text-emerald-800 dark:text-emerald-300">
        {message}
      </p>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          {error}
        </p>
      )}

      {codes.length === 0 ? (
        <EmptyState
          title={showDead ? "No codes yet" : "No live codes right now"}
          message={`Codes show here when a store's code was checked in the last ${freshnessHours} hours and still works. Turn on Show dead codes to see older ones.`}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No codes match"
          message="Try another store or search."
          action={
            filtersOn ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStore("");
                }}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul aria-label="Codes" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ code, state }) => (
            <CodeCard
              key={code.id}
              code={code}
              state={state}
              now={now}
              busy={pending.has(code.id)}
              onMark={(status) => mark(code, status)}
              onCopied={(c) => {
                setError(null);
                setMessage(`Copied ${c}.`);
              }}
              onCopyFailed={() => setError("Could not copy. Select the code and copy it yourself.")}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
