"use client";

import { useEffect, useState } from "react";
import { POLL_MS } from "@/components/AlertsView";
import { apiFetch } from "@/lib/apiClient";
import { ALERTS_CHANGED } from "@/lib/alertText";
import type { AlertsResponse } from "@/lib/types";

/**
 * Unread alert count for the Alerts tab. Polls every 60s (not while the tab is hidden) and refetches
 * when ALERTS_CHANGED fires. It reads GET /api/alerts; a count-only endpoint would be cheaper if
 * alert volume grows.
 * The number is hidden from screen readers; the link is described by "3 unread alerts" instead,
 * so its name stays "Alerts".
 */
export default function AlertsBadge({ describedById }: { describedById: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiFetch<AlertsResponse>("/api/alerts")
        .then((d) => alive && setCount(d.unreadCount))
        .catch(() => {});
    // Skip polls while the tab is hidden, and catch up as soon as it is shown again.
    const tick = () => {
      if (document.visibilityState !== "hidden") load();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    load();
    const t = setInterval(tick, POLL_MS);
    window.addEventListener(ALERTS_CHANGED, load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener(ALERTS_CHANGED, load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (count === 0) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -top-0.5 right-1/4 min-w-5 rounded-full bg-red-700 px-1.5 text-center text-xs font-bold leading-5 text-white md:static md:ml-auto"
      >
        {count > 99 ? "99+" : count}
      </span>
      {/* aria-hidden keeps this out of the link's name; aria-describedby still reads it as the description. */}
      <span id={describedById} aria-hidden="true" className="sr-only">
        {count === 1 ? "1 unread alert" : `${count} unread alerts`}
      </span>
    </>
  );
}
