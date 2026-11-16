import { loadComparison } from "@/lib/comparison";
import { demoSource } from "@/lib/demoSource";
import { listingsInclude, toListingsAndStores } from "@/lib/dto";
import { fail, itemNotFound, ok, parse, requireUserId, route } from "@/lib/http";
import { idParams } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";
import { applyListingUpdates, currentSource, REFRESH_COOLDOWN_MS } from "@/lib/refresh";

export const POST = route(async (_req: Request, ctx: RouteContext<"/api/items/[id]/refresh">) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;

  // Ownership first: another user's item is a 404, never a 429.
  const item = await prisma.item.findFirst({ where: { id: params.id, userId }, include: listingsInclude });
  if (!item) return itemNotFound();

  // Atomic claim of the refresh slot: of two concurrent calls only one matches.
  const now = Date.now();
  const claim = await prisma.item.updateMany({
    where: {
      id: item.id,
      userId,
      OR: [{ lastRefreshedAt: null }, { lastRefreshedAt: { lt: new Date(now - REFRESH_COOLDOWN_MS) } }],
    },
    data: { lastRefreshedAt: new Date(now) },
  });
  if (claim.count === 0) {
    const last = (await prisma.item.findFirst({ where: { id: item.id, userId }, select: { lastRefreshedAt: true } }))?.lastRefreshedAt;
    const wait = last ? Math.ceil((last.getTime() + REFRESH_COOLDOWN_MS - Date.now()) / 1000) : 1;
    return fail(429, "rate_limited", "Refreshed recently, try again soon", { retryAfterSeconds: Math.max(1, wait) });
  }

  // Demo prices are invented, so they only run in demo mode.
  const snapshot = toListingsAndStores(item.listings);
  const source = process.env.DEMO_MODE === "true" ? demoSource : currentSource;
  let alertsCreated: number;
  try {
    ({ alertsCreated } = await applyListingUpdates(item.id, source(snapshot.listings), snapshot));
  } catch (e) {
    // Give the cooldown slot back so the user can retry.
    await prisma.item.updateMany({ where: { id: item.id, userId }, data: { lastRefreshedAt: item.lastRefreshedAt } });
    throw e;
  }
  const comparison = await loadComparison(item.id, userId);
  return comparison ? ok({ comparison, alertsCreated }) : itemNotFound();
});
