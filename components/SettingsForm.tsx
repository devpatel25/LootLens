"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { apiFetch, friendlyMessage } from "@/lib/apiClient";
import type { FreshnessHours, Settings } from "@/lib/types";

const WINDOWS: FreshnessHours[] = [6, 12, 24, 48, 72];

export default function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const uid = useId();
  const [hours, setHours] = useState<FreshnessHours>(settings.freshnessHours);
  const [firstOrder, setFirstOrder] = useState(settings.firstOrderEligible);
  const [busy, setBusy] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);
  // seq gives each announcement a fresh node, so saving twice is announced twice.
  const [{ message, seq }, setAnnouncement] = useState({ message: "", seq: 0 });
  const setMessage = (text: string) => setAnnouncement((a) => ({ message: text, seq: a.seq + 1 }));
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await apiFetch("/api/settings", { method: "PATCH", json: { freshnessHours: hours, firstOrderEligible: firstOrder } });
      setMessage("Settings saved.");
      router.refresh();
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setBusy(false);
      // Saving disables the controls, which drops focus (for example after Enter on a radio); put it on Save.
      requestAnimationFrame(() => saveRef.current?.focus());
    }
  }

  return (
    <form onSubmit={save} className="flex max-w-xl flex-col gap-6">
      {/* Locked while saving, so the saved values always match what is shown. */}
      <fieldset disabled={busy} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p id={`${uid}-fresh`} className="font-semibold">
          Freshness window
        </p>
        <p id={`${uid}-fresh-hint`} className="text-sm text-zinc-600 dark:text-zinc-300">
          Only codes checked within this many hours count as live, on the Codes screen and in your best deals.
        </p>
        <div role="radiogroup" aria-labelledby={`${uid}-fresh`} aria-describedby={`${uid}-fresh-hint`} className="flex flex-wrap gap-2">
          {WINDOWS.map((h) => (
            <label
              key={h}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald-700 dark:border-zinc-600 dark:has-[:checked]:border-emerald-400 dark:has-[:checked]:bg-emerald-950"
            >
              <input
                type="radio"
                name={`${uid}-hours`}
                value={h}
                checked={hours === h}
                onChange={() => {
                  setHours(h);
                  setMessage("");
                  setError(null);
                }}
                className="accent-emerald-700"
              />
              {h} hours
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={firstOrder}
            onChange={(e) => {
              setFirstOrder(e.target.checked);
              setMessage("");
              setError(null);
            }}
            aria-describedby={`${uid}-first-hint`}
            className="size-4 accent-emerald-700"
          />
          I can use first-order codes
        </label>
        <p id={`${uid}-first-hint`} className="text-sm text-zinc-600 dark:text-zinc-300">
          Turn this on if you have not ordered from these stores before. First-order-only codes do not count toward your best deal
          while this is off.
        </p>
      </div>

      </fieldset>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          ref={saveRef}
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-emerald-800 dark:text-emerald-300">
          <span key={seq}>{message}</span>
        </p>
      </div>
    </form>
  );
}
