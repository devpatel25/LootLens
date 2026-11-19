import { ok, requireUserId, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { UnreadCount } from "@/lib/types";

/** GET /api/alerts/unread: the signed-in user's unread alert count, for the nav badge (count only, cheap to poll). */
export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const data: UnreadCount = { unreadCount: await prisma.alert.count({ where: { userId, read: false } }) };
  return ok(data);
});
