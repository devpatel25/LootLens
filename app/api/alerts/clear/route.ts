import { ok, requireUserId, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const POST = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const { count } = await prisma.alert.deleteMany({ where: { userId, read: true } });
  return ok({ deleted: count });
});
