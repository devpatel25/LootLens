"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import CodeCard from "@/components/CodeCard";
import DemoDataBadge from "@/components/DemoDataBadge";
import EmptyState from "@/components/EmptyState";
import { apiFetch, friendlyMessage } from "@/lib/apiClient";
import { field, smallButton } from "@/components/styles";
import { CODES_ARE_DEMO, codeState } from "@/lib/codeStatus";
import type { Code } from "@/lib/types";
import { useServerClock } from "@/lib/useNow";
import { useAnnouncement } from "@/lib/useAnnouncement";

export type CodesViewProps = { codes: Code[]; showDead: boolean; freshnessHours: number; now: string };

/**
 * An optimistic mark. It applies only while the server copy still has the check time it had when the
 * mark was made (`from`). Once a refresh brings a newer check time, from us or anyone else, the server wins.
 */
type Mark = { status: "live" | "dead"; at: string; from: string | null };

export default function CodesView({ codes, showDead, freshnessHours, now: serverNow }: CodesViewProps) {
  const router = useRouter();
  const uid = useId();
  const { now, current } = useServerClock(serverNow);
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [query, setQuery] = useState("");
  const [store, setStore] = useState("");
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [{ message, seq }, setMessage] = useAnnouncement();
  const [error, setError] = useState<string | null>(null);
  const [focusList, setFocusList] = useState(0);
  // After a failed mark, focus goes back to the button that was pressed, so keyboard users do not lose their place.
  const [focusCode, setFocusCode] = useState<{ id: string; label: string } | null>(null);
  // The box shows where we are going while the server loads the other list.
  const [switching, startSwitch] = useTransition();
  const [target, setTarget] = useState<boolean | null>(null);
  const boxChecked = switching && target !== null ? target : showDead;

  useEffect(() => {
    if (focusList === 0) return;
    (listRef.current ?? headingRef.current)?.focus();
  }, [focusList]);

  useEffect(() => {
    if (!focusCode) return;
    // Find the card by id and the button by its label as text, not in a CSS selector, so a code with a quote
    // or backslash cannot break it and two stores with the same code string cannot mix up.
    const cardEl = [...(listRef.current?.children ?? [])].find((li) => (li as HTMLElement).dataset.codeId === focusCode.id);
    [...(cardEl?.querySelectorAll("button") ?? [])].find((b) => b.getAttribute("aria-label") === focusCode.label)?.focus();
  }, [focusCode]);

  // Drop marks the server has moved past (a newer check time), so the map does not grow with every mark.
  const [marksFor, setMarksFor] = useState(codes);
  if (marksFor !== codes) {
    setMarksFor(codes);
    setMarks((m) => {
      const kept = Object.entries(m).filter(([id, mk]) => codes.some((c) => c.id === id && c.lastCheckedAt === mk.from));
      return kept.length === Object.keys(m).length ? m : Object.fromEntries(kept);
    });
  }

  const shown = codes.map((c) => {
    const m = marks[c.id];
    const code = m && m.from === c.lastCheckedAt ? { ...c, status: m.status, lastCheckedAt: m.at } : c;
    return { code, state: codeState(code, freshnessHours, now) };
  });
  const stores = [...new Set([...codes.map((c) => c.storeName), ...(store ? [store] : [])])].sort((a, b) => a.localeCompare(b));
  const q = query.trim().toLowerCase();
  const inMode = shown.filter(({ state }) => showDead || state === "live" || state === "unchecked");
  const visible = inMode.filter(
    ({ code }) =>
      (!store || code.storeName === store) && (!q || [code.code, code.label, code.storeName].some((t) => t.toLowerCase().includes(q))),
  );

  async function mark(code: Code, status: "live" | "dead", label: string) {
    const server = codes.find((c) => c.id === code.id);
    if (!server) return;
    const before = marks[code.id];
    setError(null);
    setFocusCode(null);
    setMarks((m) => ({ ...m, [code.id]: { status, at: current().toISOString(), from: server.lastCheckedAt } }));
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
      setFocusCode({ id: code.id, label });
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(code.id);
        return next;
      });
    }
  }

  const emptyLive = showDead ? (
    <EmptyState title="No codes yet" message="No codes have been added for these stores yet." />
  ) : (
    <EmptyState
      title="No live codes right now"
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
            : `Codes checked in the last ${freshnessHours} hours that still work.${
                inMode.some(({ state }) => state === "unchecked") ? " Codes no one has checked yet are tagged." : ""
              }`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-q`} className="text-sm font-medium">
            Search codes
          </label>
          <input id={`${uid}-q`} type="search" className={field} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-store`} className="text-sm font-medium">
            Store
          </label>
          <select id={`${uid}-store`} className={field} value={store} onChange={(e) => setStore(e.target.value)}>
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
        <span key={seq}>{message}</span>
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
            // Only reached when a filter is set: an empty list is handled above.
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStore("");
              }}
              className={smallButton}
            >
              Clear filters
            </button>
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
              onMark={(status, label) => mark(code, status, label)}
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
