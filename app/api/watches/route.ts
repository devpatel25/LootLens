import { z } from "zod";
import { currentForSize, DEFAULT_LOW_STOCK, evaluateWatch, MAX_WATCHES_PER_USER } from "@/lib/alerts";
import { listingsInclude, toListingsAndStores, toWatch } from "@/lib/dto";
import { fail, fkName, itemNotFound, ok, parse, requireUserId, route } from "@/lib/http";
import { Prisma } from "@/lib/generated/prisma/client";
import { moneySchema } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";
import type { CreatedWatch } from "@/lib/types";

const watchSchema = z.object({
  itemId: z.string().min(1).max(64),
  size: z.string().trim().min(1).max(20),
  targetPrice: moneySchema.nullable().optional(),
  lowStockAt: z.number().int().min(0).max(50).optional(),
});

export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const rows = await prisma.watch.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
  return ok(rows.map(toWatch));
});

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const body = parse(watchSchema, await req.json().catch(() => undefined));
  if (body instanceof Response) return body;

  try {
    return await prisma.$transaction(async (tx) => {
      // Locks serialise concurrent creates: the user row for the cap, the item row for its listings.
      // NO KEY UPDATE still excludes other creates but not the key-share lock an Alert insert takes on the user,
      // so a refresh holding the item cannot deadlock with this transaction.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Item" WHERE id = ${body.itemId} AND "userId" = ${userId} FOR UPDATE`;
      if (locked.length === 0) return itemNotFound();
      const item = await tx.item.findFirst({ where: { id: body.itemId, userId }, include: listingsInclude });
      if (!item) return itemNotFound();
      if (!item.sizes.includes(body.size)) return fail(400, "bad_request", "size: must be one of the item's sizes");

      const { listings, stores } = toListingsAndStores(item.listings);
      const now = currentForSize(listings, stores, body.size);
      const { price } = now;
      if (price === null) return fail(400, "no_listing", "No store has this size in stock");

      // Duplicate first: re-submitting an existing watch is not a cap problem.
      if (await tx.watch.findUnique({ where: { userId_itemId_size: { userId, itemId: item.id, size: body.size } } })) {
        return fail(409, "watch_exists", "Already watching this item and size");
      }
      if ((await tx.watch.count({ where: { userId } })) >= MAX_WATCHES_PER_USER) {
        return fail(409, "watch_limit", `At most ${MAX_WATCHES_PER_USER} watches`);
      }
      // Start from the current state, so an alert fires only on a later crossing.
      const targetPrice = body.targetPrice ?? null;
      const lowStockAt = body.lowStockAt ?? DEFAULT_LOW_STOCK;
      const { priceCondMet, stockCondMet } = evaluateWatch({ targetPrice, baselinePrice: price, lowStockAt }, now);
      const row = await tx.watch.create({
        data: { userId, itemId: item.id, size: body.size, targetPrice, lowStockAt, baselinePrice: price, priceCondMet, stockCondMet },
      });
      // "Any drop" (no target) is never already met.
      const alreadyMet = targetPrice !== null && price <= targetPrice;
      const created: CreatedWatch = { ...toWatch(row), alreadyMet };
      return ok(created, 201);
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003" && fkName(e) === "Watch_itemId_fkey") {
      return itemNotFound();
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail(409, "watch_exists", "Already watching this item and size");
    }
    throw e;
  }
});
