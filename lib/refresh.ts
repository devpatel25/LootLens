/* eslint-disable @typescript-eslint/no-unused-vars -- typed stub */
export const MAX_WATCHES_PER_USER = 10;
export const REFRESH_COOLDOWN_MS = 5 * 60_000;

export type ListingUpdate = { listingId: string; price: number; stockBySize: Record<string, number> };

export async function applyListingUpdates(_itemId: string, _updates: ListingUpdate[]): Promise<{ alertsCreated: number }> {
  return { alertsCreated: 0 };
}
