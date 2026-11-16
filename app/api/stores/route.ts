import { toStore } from "@/lib/dto";
import { ok, requireUserId } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  return ok((await prisma.store.findMany({ orderBy: { name: "asc" } })).map(toStore));
}
