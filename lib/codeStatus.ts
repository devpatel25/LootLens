import type { Code } from "@/lib/types";

/** What the shopper should know about a code right now. No Prisma here, so client components can import it. */
export type CodeState = "live" | "dead" | "stale" | "expired";

export function codeState(code: Pick<Code, "status" | "lastCheckedAt" | "expiresAt">, freshnessHours: number, now: Date): CodeState {
  void code; void freshnessHours; void now;
  return "live";
}

/** Codes are seeded demo data until a real code source exists (Code has no source field yet). */
export const CODES_ARE_DEMO = true;
