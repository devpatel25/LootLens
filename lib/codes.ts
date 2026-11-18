import { codeState } from "@/lib/codeStatus";
import { toCode } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import type { Code } from "@/lib/types";

/**
 * Codes for the Codes view and GET /api/codes. Default: only codes whose codeState is "live" for the given
 * freshness window (the same rule the browser uses). showDead: every code. The caller reads the user's
 * settings once and passes the window in.
 */
export async function loadCodes(opts: { showDead: boolean; storeId?: string; freshnessHours: number | Promise<number> }): Promise<Code[]> {
  const rows = await prisma.code.findMany({
    where: { ...(opts.storeId ? { storeId: opts.storeId } : {}), ...(opts.showDead ? {} : { status: "LIVE" as const }) },
    include: { store: true },
    orderBy: [{ lastCheckedAt: "desc" }, { id: "asc" }],
  });
  const codes = rows.map(toCode);
  if (opts.showDead) return codes;
  const now = new Date();
  return codes.filter((c) => codeState(c, opts.freshnessHours as number, now) === "live");
}
