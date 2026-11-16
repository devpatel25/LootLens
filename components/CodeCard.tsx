"use client";

import type { CodeState } from "@/lib/codeStatus";
import { smallButton } from "@/components/styles";
import { checkedAgo, endsIn, formatUsd } from "@/lib/format";
import { isExpired } from "@/lib/pricing";
import type { Code } from "@/lib/types";

export type CodeCardProps = {
  code: Code;
  state: CodeState;
  /** Current time as ISO. Starts as server time so the first browser render matches, then ticks. */
  now: string;
  busy: boolean;
  onMark: (status: "live" | "dead") => void;
  onCopied: (code: string) => void;
  onCopyFailed?: () => void;
};

const TAGS: Record<Exclude<CodeState, "live">, { label: string; className: string }> = {
  dead: { label: "Dead", className: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100" },
  expired: { label: "Expired", className: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200" },
  stale: {
    label: "Not checked recently",
    className: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
  },
};


export default function CodeCard({ code, state, now, busy, onMark, onCopied, onCopyFailed }: CodeCardProps) {
  const terms = [
    code.minSpend !== null ? `Min spend ${formatUsd(code.minSpend)}` : null,
    code.firstOrderOnly ? "First order only" : null,
    // The Expired tag already says it for expired codes; a dead code can also be past its end date.
    code.expiresAt && state !== "expired" ? (isExpired(code, new Date(now)) ? "Ended" : endsIn(code.expiresAt, new Date(now))) : null,
  ].filter((t): t is string => t !== null);
  const tag = state === "live" ? null : TAGS[state];

  async function copy() {
    try {
      await navigator.clipboard.writeText(code.code);
      onCopied(code.code);
    } catch {
      onCopyFailed?.();
    }
  }

  return (
    <li
      aria-label={`Code ${code.code}`}
      className={`flex min-w-0 flex-col gap-3 rounded-xl border bg-white p-4 dark:bg-zinc-900 ${
        state === "live" ? "border-zinc-200 dark:border-zinc-800" : "border-dashed border-zinc-300 dark:border-zinc-700"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{code.storeName}</span>
        {tag && <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tag.className}`}>{tag.label}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xl font-bold tracking-wider [overflow-wrap:anywhere]">{code.code}</span>
        <button type="button" onClick={copy} aria-label={`Copy code ${code.code}`} className={smallButton}>
          Copy
        </button>
      </div>
      <p className="font-semibold">{code.label}</p>
      <ul aria-label="Terms" className="flex flex-wrap gap-2 text-xs text-zinc-700 dark:text-zinc-300">
        {(terms.length ? terms : ["No extra terms"]).map((t) => (
          <li key={t} className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-zinc-600 dark:text-zinc-400">{checkedAgo(code.lastCheckedAt, new Date(now))}</span>
        {state === "dead" ? (
          <button type="button" disabled={busy} onClick={() => onMark("live")} aria-label={`Mark alive ${code.code}`} className={smallButton}>
            Mark alive
          </button>
        ) : state !== "expired" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMark("dead")}
            aria-label={`Mark dead ${code.code}`}
            className={`${smallButton} text-red-800 dark:text-red-300`}
          >
            Mark dead
          </button>
        ) : null}
      </div>
    </li>
  );
}
