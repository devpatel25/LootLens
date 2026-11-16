import { fail, ok, parse, requireUserId } from "@/lib/http";
import { idParams } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/watches/[id]">) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;

  const { count } = await prisma.watch.deleteMany({ where: { id: params.id, userId } });
  return count === 0 ? fail(404, "not_found", "Watch not found") : ok({ id: params.id });
}
