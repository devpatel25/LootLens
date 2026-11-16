"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import CodeCard from "@/components/CodeCard";
import DemoDataBadge from "@/components/DemoDataBadge";
import EmptyState from "@/components/EmptyState";
import { apiFetch, friendlyMessage } from "@/lib/apiClient";
import { CODES_ARE_DEMO, codeState } from "@/lib/codeStatus";
import type { Code } from "@/lib/types";

export type CodesViewProps = { codes: Code[]; showDead: boolean; freshnessHours: number; now: string };

/**
 * An optimistic mark. It applies only while the server copy still has the check time it had when the
 * mark was made (`from`). Once a refresh brings a newer check time, from us or anyone else, the server wins.
 */
type Mark = { status: "live" | "dead"; at: string; from: string };

const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 dark:border-zinc-600 dark:bg-zinc-800";

/** Starts at the server's time (so the first render matches), then follows the real clock every minute. */
function useNow(serverNow: string): Date {
  const [now, setNow] = useState(() => new Date(serverNow));
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function CodesView({ codes, showDead, freshnessHours, now: serverNow }: CodesViewProps) {
  const router = useRouter();
  const uid = useId();
  const now = useNow(serverNow);
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [query, setQuery] = useState("");
  const [store, setStore] = useState("");
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focusList, setFocusList] = useState(0);
  // The box shows where we are going while the server loads the other list.
  const [switching, startSwitch] = useTransition();
  const [target, setTarget] = useState<boolean | null>(null);
  const boxChecked = switching && target !== null ? target : showDead;

  useEffect(() => {
    if (focusList === 0) return;
    (listRef.current ?? headingRef.current)?.focus();
  }, [focusList]);

  const shown = codes.map((c) => {
    const m = marks[c.id];
    const code = m && m.from === c.lastCheckedAt ? { ...c, status: m.status, lastCheckedAt: m.at } : c;
    return { code, state: codeState(code, freshnessHours, now) };
  });
  const stores = [...new Set([...codes.map((c) => c.storeName), ...(store ? [store] : [])])].sort((a, b) => a.localeCompare(b));
  const q = query.trim().toLowerCase();
  const inMode = shown.filter(({ state }) => showDead || state === "live");
  const visible = inMode.filter(
    ({ code }) =>
      (!store || code.storeName === store) && (!q || [code.code, code.label, code.storeName].some((t) => t.toLowerCase().includes(q))),
  );

  async function mark(code: Code, status: "live" | "dead") {
    const server = codes.find((c) => c.id === code.id);
    if (!server) return;
    const before = marks[code.id];
    setError(null);
    setMarks((m) => ({ ...m, [code.id]: { status, at: now.toISOString(), from: server.lastCheckedAt } }));
    setPending((p) => new Set(p).add(code.id));
    if (status === "dead" && !showDead) setFocusList((n) => n + 1);
    try {
      await apiFetch(`/api/codes/${code.id}`, { method: "PATCH", json: { status } });
      setMessage(`Marked ${code.code} ${status === "dead" ? "dead" : "alive"}.`);
      router.refresh();
    } catch (e) {
      setMarks((m) => {
        const next = { ...m };
        if (before) next[code.id] = before;
        else delete next[code.id];
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
  const emptyLive = (
    <EmptyState
      title={showDead ? "No codes yet" : "No live codes right now"}
      message={`Codes show here when a store's code was checked in the last ${freshnessHours} hours and still works. Turn on Show dead codes to see older ones.`}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight focus:outline-none">
            Codes
          </h1>
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
            checked={boxChecked}
            onChange={(e) => {
              const on = e.target.checked;
              setTarget(on);
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

      {inMode.length === 0 ? (
        emptyLive
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
        <ul ref={listRef} tabIndex={-1} aria-label="Codes" className="grid grid-cols-1 gap-4 focus:outline-none sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ code, state }) => (
            <CodeCard
              key={code.id}
              code={code}
              state={state}
              now={now.toISOString()}
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
