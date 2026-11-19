import { loadAlerts } from "@/lib/alertsData";
import { ok, requireUserId, route } from "@/lib/http";

export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  return ok(await loadAlerts(userId));
});
