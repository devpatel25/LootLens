import { z } from "zod";
import { currentForSize } from "@/lib/alerts";
import { listingsInclude, toListingsAndStores, toWatch } from "@/lib/dto";
import { fail, itemNotFound, ok, parse, requireUserId, route } from "@/lib/http";
import { Prisma } from "@/lib/generated/prisma/client";
import { moneySchema } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";
import { MAX_WATCHES_PER_USER } from "@/lib/refresh";

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

  const item = await prisma.item.findFirst({
    where: { id: body.itemId, userId },
    include: listingsInclude,
  });
  if (!item) return itemNotFound();
  if (!item.sizes.includes(body.size)) return fail(400, "bad_request", "size: must be one of the item's sizes");

  const { listings, stores } = toListingsAndStores(item.listings);
  const { price } = currentForSize(listings, stores, body.size);
  if (price === null) return fail(400, "no_listing", "No store has this size in stock");

  // ponytail: count-then-create can overshoot the cap under a race; add a per-user lock if it matters
  if ((await prisma.watch.count({ where: { userId } })) >= MAX_WATCHES_PER_USER) {
    return fail(409, "watch_limit", `At most ${MAX_WATCHES_PER_USER} watches`);
  }
  try {
    const row = await prisma.watch.create({
      data: { userId, itemId: item.id, size: body.size, targetPrice: body.targetPrice ?? null, lowStockAt: body.lowStockAt, baselinePrice: price },
    });
    return ok(toWatch(row), 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail(409, "watch_exists", "Already watching this item and size");
    }
    throw e;
  }
});
