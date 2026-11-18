"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { ALERTS_CHANGED, POLL_MS } from "@/lib/alertText";
import type { UnreadCount } from "@/lib/types";
import { useVisiblePoll } from "@/lib/useVisiblePoll";

/**
 * Unread alert count for the nav badge. Reads GET /api/alerts/unread (count only) on mount, every 60s while
 * the tab is visible, and on ALERTS_CHANGED. An ALERTS_CHANGED that carries the count (the Alerts page sends
 * its own) is used as it is, and the next poll is skipped, since that page already polls. A 401 here does not
 * leave the page: it is a background call.
 */
export function useUnreadAlerts(enabled: boolean): number {
  const [count, setCount] = useState(0);
  // Only the newest request may set the count: a slow response that returns after a newer one is ignored.
  const latest = useRef(0);
  const pushedAt = useRef(0);

  // Makes any request still in flight too old to set the count.
  const forgetInFlight = useCallback(() => {
    latest.current += 1;
  }, []);

  const load = useCallback(() => {
    const id = ++latest.current;
    apiFetch<UnreadCount>("/api/alerts/unread", { background: true })
      .then((d) => id === latest.current && setCount(d.unreadCount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
    const onChange = (e: Event) => {
      const n = (e as CustomEvent<{ unreadCount?: number } | undefined>).detail?.unreadCount;
      if (typeof n !== "number") return load();
      forgetInFlight();
      pushedAt.current = Date.now();
      setCount(n);
    };
    window.addEventListener(ALERTS_CHANGED, onChange);
    return () => {
      forgetInFlight();
      window.removeEventListener(ALERTS_CHANGED, onChange);
    };
  }, [enabled, load, forgetInFlight]);

  useVisiblePoll(
    () => {
      if (Date.now() - pushedAt.current >= POLL_MS) load();
    },
    POLL_MS,
    enabled,
  );

  return count;
}
