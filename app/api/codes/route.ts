import { z } from "zod";
import { loadCodes } from "@/lib/codes";
import { ok, parse, requireUserId, route } from "@/lib/http";
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
  // Every code comes back with showDead, so the settings are only read for the live list, in parallel.
  const freshnessHours = showDead ? 0 : getSettings(userId).then((s) => s.freshnessHours);
  return ok(await loadCodes({ showDead, storeId: q.storeId, freshnessHours }));
});
