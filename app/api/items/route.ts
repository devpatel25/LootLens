import { toItem, toListingsAndStores } from "@/lib/dto";
import { generateDemoListings } from "@/lib/demoListings";
import { isStaleUser, ok, parse, requireUserId, route, unauthorized } from "@/lib/http";
import { itemSchema } from "@/lib/itemSchema";
import { cheapestListing, storeName } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import type { WishlistItem } from "@/lib/types";

export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;

  const rows = await prisma.item.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { listings: { orderBy: [{ price: "asc" }, { id: "asc" }], include: { store: true } } },
  });
  const data: WishlistItem[] = rows.map((row) => {
    const { listings, stores } = toListingsAndStores(row.listings);
    const best = cheapestListing(listings, stores, row.selectedSize);
    return {
      ...toItem(row),
      cheapest: best
        ? { listingId: best.id, storeName: storeName(stores, best), price: best.price }
        : null,
    };
  });
  return ok(data);
});

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const body = parse(itemSchema, await req.json().catch(() => undefined));
  if (body instanceof Response) return body;

  const stores = await prisma.store.findMany({ select: { id: true }, orderBy: { id: "asc" } });
  try {
    const row = await prisma.item.create({
      data: { ...body, userId, listings: { create: generateDemoListings(body, stores.map((s) => s.id)) } },
    });
    return ok(toItem(row), 201);
  } catch (e) {
    if (isStaleUser(e)) return unauthorized();
    throw e;
  }
});
