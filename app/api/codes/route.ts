import { z } from "zod";
import { toCode } from "@/lib/dto";
import { fail, isStaleUser, ok, parse, requireUserId } from "@/lib/http";
import { isExpired, isFresh } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const query = z.object({
  storeId: z.string().min(1).max(64).optional(),
  showDead: z.enum(["true", "false"]).default("false"),
});

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const q = parse(query, Object.fromEntries(new URL(req.url).searchParams));
  if (q instanceof Response) return q;

  try {
    const settings = await getSettings(userId);
    const rows = await prisma.code.findMany({
      where: q.storeId ? { storeId: q.storeId } : {},
      include: { store: true },
      orderBy: [{ lastCheckedAt: "desc" }, { id: "asc" }],
    });
    const now = new Date();
    const codes = rows.map(toCode);
    return ok(q.showDead === "true" ? codes : codes.filter((c) => isFresh(c, settings.freshnessHours, now) && !isExpired(c, now)));
  } catch (e) {
    if (isStaleUser(e)) return fail(401, "unauthorized", "Sign in required");
    throw e;
  }
}
