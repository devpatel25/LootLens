import { z } from "zod";
import { toCode } from "@/lib/dto";
import { ok, parse, requireUserId, route } from "@/lib/http";
import { isExpired, isFresh } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const query = z.object({
  storeId: z.string().min(1).max(64).optional(),
  showDead: z.enum(["true", "false"]).default("false"),
});

export const GET = route(async (req: Request) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const q = parse(query, Object.fromEntries(new URL(req.url).searchParams));
  if (q instanceof Response) return q;

  const showDead = q.showDead === "true";
  const [rows, settings] = await Promise.all([
    prisma.code.findMany({
      where: { ...(q.storeId ? { storeId: q.storeId } : {}), ...(showDead ? {} : { status: "LIVE" as const }) },
      include: { store: true },
      orderBy: [{ lastCheckedAt: "desc" }, { id: "asc" }],
    }),
    showDead ? null : getSettings(userId),
  ]);
  const codes = rows.map(toCode);
  if (!settings) return ok(codes);
  const now = new Date();
  return ok(codes.filter((c) => isFresh(c, settings.freshnessHours, now) && !isExpired(c, now)));
});
