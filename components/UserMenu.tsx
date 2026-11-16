"use client";

import { useEffect, useId, useRef, useState } from "react";

export type UserMenuProps = {
  name: string | null;
  email: string | null;
  signOutAction: () => void | Promise<void>;
};

export default function UserMenu({ name, email, signOutAction }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const who = name ?? email;
  const initial = (who ?? "?").trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      // Keyboard users who Tab past the last item leave the menu; close it so it does not float over the page.
      onBlur={(e) => {
        // relatedTarget is null when a click lands on a non-focusable spot or the window loses focus, and
        // Safari does not focus buttons on click; only close when focus really moved to another element.
        const next = e.relatedTarget as Node | null;
        if (open && next && !rootRef.current?.contains(next)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        aria-label={who ? `Account menu for ${who}` : "Account menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-full bg-zinc-800 text-sm font-semibold text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        <span aria-hidden="true">{initial}</span>
      </button>
      {/* Always rendered (hidden when closed), so aria-controls never points at a missing element. */}
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      >
          {name && <p className="truncate text-sm font-semibold">{name}</p>}
          {email && <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">{email}</p>}
          <form action={signOutAction} className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-emerald-700 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
      </div>
    </div>
  );
}
