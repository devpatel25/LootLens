"use client";

import { useId, useState } from "react";
import { friendlyMessage } from "@/lib/apiClient";
import { useModalDialog } from "@/lib/useModalDialog";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  /** The button that opened the dialog; focus returns to it. */
  opener?: HTMLElement | null;
};

export default function ConfirmDialog(props: ConfirmDialogProps) {
  return props.open ? <OpenConfirmDialog {...props} /> : null;
}

function OpenConfirmDialog({ title, message, confirmLabel, onConfirm, onClose, opener }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const ref = useModalDialog(() => {
    if (busy) return false;
    onClose();
  }, opener);
  const titleId = useId();
  const messageId = useId();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(friendlyMessage(e));
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-zinc-950/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <p id={messageId} className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {message}
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          disabled={busy}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60"
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
