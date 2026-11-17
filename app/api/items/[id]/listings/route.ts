import { loadComparison } from "@/lib/comparison";
import { itemNotFound, ok, parse, requireUserId, route } from "@/lib/http";
import { idParams } from "@/lib/itemSchema";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/items/[id]/listings">) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;

  const data = await loadComparison(params.id, userId);
  return data ? ok(data) : itemNotFound();
});
