import { toAlert } from "@/lib/dto";
import { ok, requireUserId } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { Alert, AlertsResponse } from "@/lib/types";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;

  const rows = await prisma.alert.findMany({
    where: { userId },
    include: { item: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  // Rows are newest first, so groups come out ordered by their newest alert.
  const groups = new Map<string, { itemId: string; itemName: string; unread: number; alerts: Alert[] }>();
  for (const row of rows) {
    const g = groups.get(row.itemId) ?? { itemId: row.itemId, itemName: row.item.name, unread: 0, alerts: [] };
    g.alerts.push(toAlert(row));
    if (!row.read) g.unread++;
    groups.set(row.itemId, g);
  }
  const data: AlertsResponse = { groups: [...groups.values()], unreadCount: rows.filter((r) => !r.read).length };
  return ok(data);
}
