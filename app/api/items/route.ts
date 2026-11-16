import { toItem, toListingsAndStores } from "@/lib/dto";
import { generateDemoListings } from "@/lib/demoListings";
import { isStaleUser, ok, parse, requireUserId, unauthorized } from "@/lib/http";
import { itemSchema } from "@/lib/itemSchema";
import { cheapestListing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import type { WishlistItem } from "@/lib/types";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;

  const rows = await prisma.item.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { listings: { include: { store: true } } },
  });
  const data: WishlistItem[] = rows.map((row) => {
    const { listings, stores } = toListingsAndStores(row.listings);
    const best = cheapestListing(listings, stores, row.selectedSize);
    return {
      ...toItem(row),
      cheapest: best
        ? { listingId: best.id, storeName: stores.find((s) => s.id === best.storeId)?.name ?? "", price: best.price }
        : null,
    };
  });
  return ok(data);
}

export async function POST(req: Request) {
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
}
