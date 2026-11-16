import { toCode } from "@/lib/dto";
import { isExpired, isFresh } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import type { Code } from "@/lib/types";

/** Codes for the Codes view. Default: live, fresh for the user's window, not expired. showDead: every code. */
export async function loadCodes(opts: { showDead: boolean; storeId?: string; freshnessHours: number }): Promise<Code[]> {
  const userId = "";
  const [rows, settings] = await Promise.all([
    prisma.code.findMany({
      where: { ...(opts.storeId ? { storeId: opts.storeId } : {}), ...(opts.showDead ? {} : { status: "LIVE" as const }) },
      include: { store: true },
      orderBy: [{ lastCheckedAt: "desc" }, { id: "asc" }],
    }),
    opts.showDead ? null : getSettings(userId),
  ]);
  const codes = rows.map(toCode);
  if (!settings) return codes;
  const now = new Date();
  return codes.filter((c) => isFresh(c, settings.freshnessHours, now) && !isExpired(c, now));
}
