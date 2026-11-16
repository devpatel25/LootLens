import { timingSafeEqual } from "node:crypto";
import { ok, route, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { applyRefresh, refreshSource } from "@/lib/refresh";

const PAGE = 50;

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

  // Codes first, so they expire even if item refreshes are slow or fail.
  const { count: codesExpired } = await prisma.code.updateMany({
    where: { status: "LIVE", expiresAt: { lt: new Date() } },
    data: { status: "DEAD" },
  });

  // ponytail: sequential pages of 50; ends at the function max duration. Upgrade path: a queue with one job per item.
  const source = refreshSource();
  let items = 0;
  let alertsCreated = 0;
  let failed = 0;
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.item.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const { id } of page) {
      try {
        alertsCreated += (await applyRefresh(id, source)).alertsCreated;
        items++;
      } catch (e) {
        console.error("cron refresh failed for item", id, e);
        failed++;
      }
    }
    if (page.length < PAGE) break;
    cursor = page[page.length - 1].id;
  }
  return ok({ items, alertsCreated, codesExpired, failed });
});
