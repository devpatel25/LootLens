"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `fn` every `ms` while the tab is visible, and once when it is shown again, so a hidden tab costs
 * nothing and catches up on return. The latest `fn` is always used without restarting the timer.
 */
export function useVisiblePoll(fn: () => void, ms: number, enabled = true): void {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState !== "hidden") latest.current();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") latest.current();
    };
    const t = setInterval(tick, ms);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ms, enabled]);
}
