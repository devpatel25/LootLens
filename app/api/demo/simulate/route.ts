import { z } from "zod";
import { demoSource } from "@/lib/demoSource";
import { demoGate } from "@/lib/demoGate";
import { fail, itemNotFound, ok, parse, requireUserId, route } from "@/lib/http";
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
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (body.itemId && items.length === 0) return itemNotFound();
  const { failed, ...result } = await refreshItems(items.map((i) => i.id), demoSource);
  return failed > 0 ? fail(500, "internal", "Something went wrong") : ok(result);
});
