import { z } from "zod";
import { currentForSize } from "@/lib/alerts";
import { toListingsAndStores, toWatch } from "@/lib/dto";
import { fail, isStaleUser, ok, parse, requireUserId, unauthorized } from "@/lib/http";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_WATCHES_PER_USER } from "@/lib/refresh";

const watchSchema = z.object({
  itemId: z.string().min(1).max(64),
  size: z.string().trim().min(1).max(20),
  // Fits Decimal(10,2): at most 99999.99 and whole cents.
  targetPrice: z
    .number()
    .positive()
    .max(99999.99)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "at most 2 decimal places")
    .nullable()
    .optional(),
  lowStockAt: z.number().int().min(0).max(50).optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const rows = await prisma.watch.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
  return ok(rows.map(toWatch));
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const body = parse(watchSchema, await req.json().catch(() => undefined));
  if (body instanceof Response) return body;

  const item = await prisma.item.findFirst({
    where: { id: body.itemId, userId },
    include: { listings: { include: { store: true } } },
  });
  if (!item) return fail(404, "not_found", "Item not found");
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
    if (isStaleUser(e)) return unauthorized();
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail(409, "watch_exists", "Already watching this item and size");
    }
    throw e;
  }
}
