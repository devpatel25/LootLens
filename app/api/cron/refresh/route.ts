import { timingSafeEqual } from "node:crypto";
import { listingsInclude } from "@/lib/dto";
import { ok, route, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { refreshItems, refreshSource } from "@/lib/refresh";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

// No session: Vercel Cron calls this with the bearer secret.
export const GET = route(async (req: Request) => {
  if (!authorized(req)) return unauthorized();

  const items = await prisma.item.findMany({ include: listingsInclude, orderBy: { id: "asc" } });
  const refreshed = await refreshItems(items, refreshSource());
  const { count: codesExpired } = await prisma.code.updateMany({
    where: { status: "LIVE", expiresAt: { lt: new Date() } },
    data: { status: "DEAD" },
  });
  return ok({ ...refreshed, codesExpired });
});

