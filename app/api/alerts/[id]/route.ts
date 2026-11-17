import { z } from "zod";
import { toAlert } from "@/lib/dto";
import { fail, ok, parse, requireUserId, route } from "@/lib/http";
import { idParams } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ read: z.boolean() });
const notFound = () => fail(404, "not_found", "Alert not found");

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/alerts/[id]">) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;
  const body = parse(bodySchema, await req.json().catch(() => undefined));
  if (body instanceof Response) return body;

  const { count } = await prisma.alert.updateMany({ where: { id: params.id, userId }, data: { read: body.read } });
  if (count === 0) return notFound();
  const row = await prisma.alert.findFirst({ where: { id: params.id, userId }, include: { item: true } });
  return row ? ok(toAlert(row)) : notFound();
});
