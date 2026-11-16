import { timingSafeEqual } from "node:crypto";
import { ok, route, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { refreshItems, refreshSource } from "@/lib/refresh";

// Vercel Hobby caps a function at 60s (Fluid compute off). A longer run stops there; items not reached wait for the next run.
export const maxDuration = 60;
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
  const total = { items: 0, alertsCreated: 0, failed: 0 };
  let lastId = "";
  for (;;) {
    const page = await prisma.item.findMany({
      select: { id: true },
      where: { id: { gt: lastId } },
      orderBy: { id: "asc" },
      take: PAGE,
    });
    const r = await refreshItems(page.map((i) => i.id), source);
    total.items += r.items;
    total.alertsCreated += r.alertsCreated;
    total.failed += r.failed;
    if (page.length < PAGE) break;
    lastId = page[page.length - 1].id;
  }
  return ok({ ...total, codesExpired });
});
