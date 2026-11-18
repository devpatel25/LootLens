import { toAlert, toWatch } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import type { Alert, AlertsResponse, Watch } from "@/lib/types";

export type WatchWithItem = Watch & { itemName: string };

const MAX_ALERTS = 200;

/** The user's alerts grouped by item, newest first, with unread counts (GET /api/alerts uses this). */
export async function loadAlerts(userId: string): Promise<AlertsResponse> {
  // Unread counts come from the database, so they stay right beyond the limit.
  const [rows, unreadRows, readCount] = await Promise.all([
    prisma.alert.findMany({
      where: { userId },
      include: { item: true },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: MAX_ALERTS,
    }),
    prisma.alert.groupBy({ by: ["itemId"], where: { userId, read: false }, _count: { _all: true } }),
    // All read alerts, not only the ones loaded, so Clear read alerts shows whenever it would do something.
    prisma.alert.count({ where: { userId, read: true } }),
  ]);
  const unreadByItem = new Map(unreadRows.map((r) => [r.itemId, r._count._all]));
  // Rows are newest first, so groups come out ordered by their newest alert.
  const groups = new Map<string, { itemId: string; itemName: string; unread: number; alerts: Alert[] }>();
  for (const row of rows) {
    const g = groups.get(row.itemId) ?? { itemId: row.itemId, itemName: row.item.name, unread: unreadByItem.get(row.itemId) ?? 0, alerts: [] };
    g.alerts.push(toAlert(row));
    groups.set(row.itemId, g);
  }
  return { groups: [...groups.values()], unreadCount: [...unreadByItem.values()].reduce((n, c) => n + c, 0), readCount };
}

/** The user's watches with item names, newest first (GET /api/watches returns the same rows without names). */
export async function loadWatches(userId: string): Promise<WatchWithItem[]> {
  const rows = await prisma.watch.findMany({
    where: { userId },
    include: { item: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return rows.map((r) => ({ ...toWatch(r), itemName: r.item.name }));
}

/** The user's watch on one item and size, or null. */
/** The user's watches on one item, every size. The Item page reads them next to the comparison, then picks its size. */
export async function loadItemWatches(userId: string, itemId: string): Promise<Watch[]> {
  return (await prisma.watch.findMany({ where: { userId, itemId }, orderBy: { size: "asc" } })).map(toWatch);
}
