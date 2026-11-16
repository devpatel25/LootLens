"use client";

import { useEffect, useRef } from "react";

/**
 * Opens a <dialog> as a modal while it is mounted. Escape (the dialog's cancel event) calls onClose.
 * Focus starts on the element marked data-autofocus (React's autoFocus does not set the HTML attribute
 * showModal looks for). On unmount the dialog closes and focus goes back to whatever opened it.
 * jsdom has no showModal, so it falls back to the open attribute.
 */
export function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return ref;
}
