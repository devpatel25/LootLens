import { toItem } from "@/lib/dto";
import { generateDemoListings } from "@/lib/demoListings";
import { ok, parse, requireUserId, route } from "@/lib/http";
import { itemSchema } from "@/lib/itemSchema";
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
  const row = await prisma.item.create({
    data: { ...body, userId, listings: { create: generateDemoListings(body, stores.map((s) => s.id)) } },
  });
  return ok(toItem(row), 201);
});
