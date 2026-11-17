import { toStore } from "@/lib/dto";
import { ok, requireUserId, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  return ok((await prisma.store.findMany({ orderBy: { name: "asc" } })).map(toStore));
});
