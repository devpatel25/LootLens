import { toItem } from "@/lib/dto";
import { generateDemoListings } from "@/lib/demoListings";
import { fail, ok, parse, requireUserId, route } from "@/lib/http";
import { itemSchema, MAX_ITEMS_PER_USER } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";
import { loadWishlist } from "@/lib/wishlist";

export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  return ok(await loadWishlist(userId));
});

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const body = parse(itemSchema, await req.json().catch(() => undefined));
  if (body instanceof Response) return body;

  const stores = await prisma.store.findMany({ select: { id: true }, orderBy: { id: "asc" } });
  const row = await prisma.$transaction(async (tx) => {
    // Same lock as watches: serialises concurrent creates so the cap holds.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
    if ((await tx.item.count({ where: { userId } })) >= MAX_ITEMS_PER_USER) return null;
    return tx.item.create({
      data: { ...body, userId, listings: { create: generateDemoListings(body, stores.map((s) => s.id)) } },
    });
  });
  if (!row) return fail(409, "item_limit", `At most ${MAX_ITEMS_PER_USER} items`);
  return ok(toItem(row), 201);
});
