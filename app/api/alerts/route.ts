import { toAlert } from "@/lib/dto";
import { ok, requireUserId, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { Alert, AlertsResponse } from "@/lib/types";

const MAX_ALERTS = 200;

export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;

  const rows = await prisma.alert.findMany({
    where: { userId },
    include: { item: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAX_ALERTS,
  });
  // Counted in the database, so they stay right beyond the limit.
  const unreadRows = await prisma.alert.groupBy({ by: ["itemId"], where: { userId, read: false }, _count: { _all: true } });
  const unreadByItem = new Map(unreadRows.map((r) => [r.itemId, r._count._all]));
  // Rows are newest first, so groups come out ordered by their newest alert.
  const groups = new Map<string, { itemId: string; itemName: string; unread: number; alerts: Alert[] }>();
  for (const row of rows) {
    const g = groups.get(row.itemId) ?? { itemId: row.itemId, itemName: row.item.name, unread: unreadByItem.get(row.itemId) ?? 0, alerts: [] };
    g.alerts.push(toAlert(row));
    groups.set(row.itemId, g);
  }
  const data: AlertsResponse = { groups: [...groups.values()], unreadCount: [...unreadByItem.values()].reduce((n, c) => n + c, 0) };
  return ok(data);
});
