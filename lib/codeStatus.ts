import { isExpired, isFresh } from "@/lib/pricing";
import type { Code } from "@/lib/types";

/** What the shopper should know about a code right now. No Prisma here, so client components can import it. */
export type CodeState = "live" | "dead" | "stale" | "expired";

/** dead beats expired beats stale (not checked inside the freshness window). Same rules as GET /api/codes. */
export function codeState(code: Pick<Code, "status" | "lastCheckedAt" | "expiresAt">, freshnessHours: number, now: Date): CodeState {
  if (code.status === "dead") return "dead";
  if (isExpired(code, now)) return "expired";
  if (!isFresh(code, freshnessHours, now)) return "stale";
  return "live";
}

/** Codes are seeded demo data until a real code source exists (Code has no source field yet). */
export const CODES_ARE_DEMO = true;
