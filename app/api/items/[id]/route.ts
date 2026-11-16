import { toItem } from "@/lib/dto";
import { fail, ok, parse, requireUserId } from "@/lib/http";
import { idParams, itemPatchSchema, itemSchema } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";

const notFound = () => fail(404, "not_found", "Item not found");

export async function GET(_req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;

  const row = await prisma.item.findFirst({ where: { id: params.id, userId } });
  return row ? ok(toItem(row)) : notFound();
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;
  const patch = parse(itemPatchSchema, await req.json().catch(() => undefined));
  if (patch instanceof Response) return patch;

  const row = await prisma.item.findFirst({ where: { id: params.id, userId } });
  if (!row) return notFound();

  const merged = parse(itemSchema, { ...toItem(row), ...patch });
  if (merged instanceof Response) return merged;
  const updated = await prisma.item.update({ where: { id: row.id }, data: merged });
  return ok(toItem(updated));
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;

  const { count } = await prisma.item.deleteMany({ where: { id: params.id, userId } });
  return count === 0 ? notFound() : ok({ id: params.id });
}
