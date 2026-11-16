"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A clock anchored to the server's time. It shows the server's time first (so the first browser render
 * matches the HTML), learns the device clock's offset from the server once mounted, and ticks once a minute
 * on server time. A device clock that is hours off therefore cannot hide codes the server called live, and a
 * newer `serverNow` (after router.refresh) is used at once. `current()` gives the server-time "now" for event
 * handlers, such as stamping an optimistic mark.
 */
export function useServerClock(serverNow: string): { now: Date; current: () => Date } {
  const [anchor, setAnchor] = useState(() => ({ serverNow, now: new Date(serverNow) }));
  if (anchor.serverNow !== serverNow) {
    // Adjusting state while rendering is React's pattern for "reset when a prop changes".
    setAnchor({ serverNow, now: new Date(serverNow) });
  }
  const offset = useRef(0);

  useEffect(() => {
    offset.current = Date.parse(serverNow) - Date.now();
  }, [serverNow]);

  useEffect(() => {
    const t = setInterval(() => setAnchor((a) => ({ ...a, now: new Date(Date.now() + offset.current) })), 60_000);
    return () => clearInterval(t);
  }, []);

  const current = useCallback(() => new Date(Date.now() + offset.current), []);
  return { now: anchor.now, current };
}
