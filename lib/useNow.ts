"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** A device clock this far from the server is trusted at once; a bigger gap is checked with one refresh. */
export const MAX_TRUSTED_OFFSET_MS = 5 * 60_000;

/**
 * A clock anchored to the server's time. It shows the server's time first (so the first browser render
 * matches the HTML), learns the device clock's offset from the server once mounted, and ticks once a minute
 * on server time. A device clock that is hours off therefore cannot hide codes the server called live, and a
 * newer `serverNow` (after router.refresh) is used at once. `current()` gives the server-time "now" for event
 * handlers, such as stamping an optimistic mark.
 *
 * A gap over MAX_TRUSTED_OFFSET_MS is not trusted at first: back navigation can restore a page whose server
 * time is old, and trusting it would keep a code live after its window closed. `current()` and the next tick
 * use the device clock, and the page refreshes once; the server time that refresh brings back is fresh, so
 * it is trusted even when the device clock really is far off. Until then the screen keeps the page's own
 * time, so it matches the server HTML and a fast device clock cannot hide live codes in the meantime.
 */
export function useServerClock(serverNow: string): { now: Date; current: () => Date } {
  const [anchor, setAnchor] = useState(() => ({ serverNow, now: new Date(serverNow) }));
  if (anchor.serverNow !== serverNow) {
    // Adjusting state while rendering is React's pattern for "reset when a prop changes".
    setAnchor({ serverNow, now: new Date(serverNow) });
  }
  const offset = useRef(0);
  const router = useRouter();
  // The server time we asked the server to replace. Any other server time is newer, so it is trusted.
  const askedFor = useRef<string | null>(null);

  useEffect(() => {
    const gap = Date.parse(serverNow) - Date.now();
    if (Math.abs(gap) <= MAX_TRUSTED_OFFSET_MS || (askedFor.current !== null && askedFor.current !== serverNow)) {
      offset.current = gap;
      return;
    }
    offset.current = 0;
    // StrictMode runs this effect twice in dev: ask once per server time.
    if (askedFor.current === serverNow) return;
    askedFor.current = serverNow;
    router.refresh();
  }, [serverNow, router]);

  useEffect(() => {
    const t = setInterval(() => setAnchor((a) => ({ ...a, now: new Date(Date.now() + offset.current) })), 60_000);
    return () => clearInterval(t);
  }, []);

  const current = useCallback(() => new Date(Date.now() + offset.current), []);
  return { now: anchor.now, current };
}
