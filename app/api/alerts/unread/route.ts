import { ok, requireUserId, route } from "@/lib/http";
import type { UnreadCount } from "@/lib/types";

/** GET /api/alerts/unread: the signed-in user's unread alert count, for the nav badge (stub for the red step). */
export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const data: UnreadCount = { unreadCount: 0 };
  return ok(data);
});
