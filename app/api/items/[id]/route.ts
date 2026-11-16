import { generateDemoListings } from "@/lib/demoListings";
import { toItem } from "@/lib/dto";
import { fail, isMissingRow, ok, parse, requireUserId } from "@/lib/http";
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

  const sizesChanged = merged.sizes.join("\u0000") !== row.sizes.join("\u0000");
  const storeIds = sizesChanged ? (await prisma.store.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map((s) => s.id) : [];
  try {
    const count = await prisma.$transaction(async (tx) => {
      const r = await tx.item.updateMany({ where: { id: row.id, userId }, data: merged });
      if (r.count === 0 || !sizesChanged) return r.count;
      // ponytail: all listings are demo until the price source lands; revisit when live listings exist
      await tx.listing.deleteMany({ where: { itemId: row.id } });
      await tx.listing.createMany({ data: generateDemoListings(merged, storeIds).map((l) => ({ ...l, itemId: row.id })) });
      await tx.watch.deleteMany({ where: { itemId: row.id, size: { notIn: merged.sizes } } });
      return r.count;
    });
    const updated = count === 0 ? null : await prisma.item.findFirst({ where: { id: row.id, userId } });
    return updated ? ok(toItem(updated)) : notFound();
  } catch (e) {
    if (isMissingRow(e)) return notFound();
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/items/[id]">) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;

  const { count } = await prisma.item.deleteMany({ where: { id: params.id, userId } });
  return count === 0 ? notFound() : ok({ id: params.id });
}
