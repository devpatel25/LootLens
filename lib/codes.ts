import { codeState } from "@/lib/codeStatus";
import { toCode } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import type { Code } from "@/lib/types";

/**
 * Codes for the Codes view and GET /api/codes. Default: codes whose codeState is "live" for the given
 * freshness window (the same rule the browser uses), then codes no one has checked yet ("unchecked"). showDead: every code. The caller reads the user's
 * settings once and passes the window in, as a number or a promise, so the settings read can run at the same
 * time as the codes query. With showDead the window is not used.
 */
export async function loadCodes(opts: { showDead: boolean; storeId?: string; freshnessHours: number | Promise<number> }): Promise<Code[]> {
  const [rows, freshnessHours] = await Promise.all([
    prisma.code.findMany({
      where: { ...(opts.storeId ? { storeId: opts.storeId } : {}), ...(opts.showDead ? {} : { status: "LIVE" as const }) },
      include: { store: true },
      // Checked codes first, newest check first; codes no one has checked come last.
      orderBy: [{ lastCheckedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }],
    }),
    opts.freshnessHours,
  ]);
  const codes = rows.map(toCode);
  if (opts.showDead) return codes;
  const now = new Date();
  return codes.filter((c) => ["live", "unchecked"].includes(codeState(c, freshnessHours, now)));
}
