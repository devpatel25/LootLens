"use client";

/** Server-anchored clock. Stub. */
export function useServerClock(serverNow: string): { now: Date; current: () => Date } {
  const d = new Date(serverNow);
  return { now: d, current: () => d };
}
