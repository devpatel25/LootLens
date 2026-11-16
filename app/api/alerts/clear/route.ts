import { ok, requireUserId } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const { count } = await prisma.alert.deleteMany({ where: { userId, read: true } });
  return ok({ deleted: count });
}
