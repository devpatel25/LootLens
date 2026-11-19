"use client";

import { useEffect, useRef } from "react";

/**
 * Opens a <dialog> as a modal while it is mounted.
 * - Escape (the cancel event) calls onClose. onClose returns false to refuse, for example while saving.
 * - If the browser closes the modal anyway (repeated Escape), onClose is asked once; if it refuses, the
 *   dialog is shown again.
 * - Focus starts on the element marked data-autofocus (React's autoFocus does not reach showModal).
 * - On unmount, focus goes back to `opener`, the button that opened the dialog. Pass it from the click
 *   handler: Safari does not focus a button on click, so document.activeElement is only a fallback.
 * jsdom has no showModal, so it falls back to the open attribute.
 */
export function useModalDialog(onClose: () => boolean | void, opener?: HTMLElement | null) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const openerRef = useRef(opener);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const returnTo = openerRef.current ?? (document.activeElement as HTMLElement | null);
    const show = () => {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    };
    show();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    let accepted = false;
    const ask = () => {
      if (accepted) return;
      accepted = onCloseRef.current() !== false;
    };
    const onCancel = (e: Event) => {
      e.preventDefault();
      ask();
    };
    const onNativeClose = () => {
      ask();
      if (!accepted && dialog.isConnected) show();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onNativeClose);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onNativeClose);
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, []);

  return ref;
}
