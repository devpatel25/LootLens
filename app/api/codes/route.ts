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

  const { freshnessHours } = await getSettings(userId);
  return ok(await loadCodes({ showDead: q.showDead === "true", storeId: q.storeId, freshnessHours }));
});
