import { resizeStock } from "@/lib/demoListings";
import { toItem } from "@/lib/dto";
import { fail, ok, parse, requireUserId, route } from "@/lib/http";
import { idParams, itemPatchSchema, itemSchema } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";

const notFound = () => fail(404, "not_found", "Item not found");

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/items/[id]">) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;

  const row = await prisma.item.findFirst({ where: { id: params.id, userId } });
  return row ? ok(toItem(row)) : notFound();
});

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/items/[id]">) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;
  const patch = parse(itemPatchSchema, await req.json().catch(() => undefined));
  if (patch instanceof Response) return patch;

  // One transaction with the item row locked, so concurrent PATCHes run one after the other.
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Item" WHERE "id" = ${params.id} AND "userId" = ${userId} FOR UPDATE`;
    if (locked.length === 0) return notFound();
    const row = await tx.item.findUniqueOrThrow({ where: { id: params.id } });

    const merged = parse(itemSchema, { ...toItem(row), ...patch });
    if (merged instanceof Response) return merged;

    const updated = await tx.item.update({ where: { id: row.id }, data: patch });
    if (!sameSet(merged.sizes, row.sizes)) {
      // ponytail: all listings are demo until the price source lands; demo stock is regenerated for new sizes only
      const listings = await tx.listing.findMany({ where: { itemId: row.id }, orderBy: [{ price: "asc" }, { id: "asc" }] });
      const stocks = resizeStock(listings.map((l) => ({ id: l.id, stockBySize: l.stockBySize as Record<string, number> })), merged);
      for (const [i, l] of listings.entries()) {
        await tx.listing.update({ where: { id: l.id }, data: { stockBySize: stocks[i] } });
      }
      await tx.watch.deleteMany({ where: { itemId: row.id, size: { notIn: merged.sizes } } });
    }
    return ok(toItem(updated));
  });
});

export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/items/[id]">) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;

  const { count } = await prisma.item.deleteMany({ where: { id: params.id, userId } });
  return count === 0 ? notFound() : ok({ id: params.id });
});
