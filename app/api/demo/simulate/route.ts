import { z } from "zod";
import { demoSource } from "@/lib/demoSource";
import { demoGate } from "@/lib/demoGate";
import { listingsInclude } from "@/lib/dto";
import { itemNotFound, ok, parse, requireUserId, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { refreshItems } from "@/lib/refresh";

const bodySchema = z.object({ itemId: z.string().min(1).max(64).optional() });

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const gate = demoGate();
  if (gate) return gate;
  const body = parse(bodySchema, await req.json().catch(() => ({})));
  if (body instanceof Response) return body;

  const items = await prisma.item.findMany({
    where: { userId, ...(body.itemId ? { id: body.itemId } : {}) },
    include: listingsInclude,
    orderBy: { id: "asc" },
  });
  if (body.itemId && items.length === 0) return itemNotFound();
  return ok(await refreshItems(items, demoSource));
});
