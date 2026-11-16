import type { AlertsResponse, Watch } from "@/lib/types";

export type WatchWithItem = Watch & { itemName: string };

/** The user's alerts grouped by item, newest first, with unread counts. Stub. */
export async function loadAlerts(userId: string): Promise<AlertsResponse> {
  void userId;
  return { groups: [], unreadCount: 0 };
}

/** The user's watches with item names, newest first. Stub. */
export async function loadWatches(userId: string): Promise<WatchWithItem[]> {
  void userId;
  return [];
}

/** The user's watch on one item and size, or null. Stub. */
export async function loadWatchFor(userId: string, itemId: string, size: string): Promise<Watch | null> {
  void userId; void itemId; void size;
  return null;
}
