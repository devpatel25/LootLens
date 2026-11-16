import { alertKindForStock, currentForSize, evaluateWatch } from "@/lib/alerts";
import { demoEnabled } from "@/lib/demoGate";
import { demoSource } from "@/lib/demoSource";
import { toListingsAndStores } from "@/lib/dto";
import type { Listing } from "@/lib/types";
import { prisma } from "@/lib/prisma";

export const MAX_WATCHES_PER_USER = 10;
export const REFRESH_COOLDOWN_MS = 5 * 60_000;

export type ListingUpdate = { listingId: string; price: number; stockBySize: Record<string, number> };

/** A source that reports each listing as it is. */
// ponytail: replaced by the price source adapter in #12
export function currentSource(listings: Listing[]): ListingUpdate[] {
  return listings.map((l) => ({ listingId: l.id, price: l.price, stockBySize: l.stockBySize }));
}

/**
 * Under a lock on the item row: reads the listings, asks the source for updates from that state, applies them,
 * then raises alerts for the item's active watches. Concurrent refreshes of one item run one after the other,
 * each on the latest state.
 * Dedupe: an alert is created only by the call that flips a watch's cond flag from false to true.
 */
export async function applyRefresh(
  itemId: string,
  source: (listings: Listing[]) => ListingUpdate[],
): Promise<{ alertsCreated: number }> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ${itemId} FOR UPDATE`;
    const load = async () => {
      const rows = await tx.listing.findMany({ where: { itemId }, include: { store: true }, orderBy: { id: "asc" } });
      return toListingsAndStores(rows);
    };
    const snapshot = await load();
    const oldPrice = new Map(snapshot.listings.map((l) => [l.id, l.price]));
    const updates = [...source(snapshot.listings)].sort((a, b) => a.listingId.localeCompare(b.listingId));

    const changed: { listingId: string; price: number }[] = [];
    for (const u of updates) {
      const r = await tx.listing.updateMany({ where: { id: u.listingId, itemId }, data: { price: u.price, stockBySize: u.stockBySize } });
      if (r.count === 1 && oldPrice.get(u.listingId) !== u.price) changed.push({ listingId: u.listingId, price: u.price });
    }
    await tx.priceHistory.createMany({ data: changed });
    const after = await load();
    const watches = await tx.watch.findMany({ where: { itemId, active: true }, orderBy: { id: "asc" } });

    let alertsCreated = 0;
    for (const w of watches) {
      const prev = currentForSize(snapshot.listings, snapshot.stores, w.size);
      const now = currentForSize(after.listings, after.stores, w.size);
      const met = evaluateWatch(
        { targetPrice: w.targetPrice?.toNumber() ?? null, baselinePrice: w.baselinePrice.toNumber(), lowStockAt: w.lowStockAt },
        now,
      );
      const base = { userId: w.userId, itemId, watchId: w.id };
      const flip = async (field: "priceCondMet" | "stockCondMet", cond: boolean) => {
        const r = await tx.watch.updateMany({ where: { id: w.id, [field]: !cond }, data: { [field]: cond } });
        return cond && r.count === 1;
      };
      // No price while the size is sold out: keep the flag, so a restock at the same price stays quiet.
      if (now.price !== null && (await flip("priceCondMet", met.priceCondMet))) {
        // When the size was out of stock before, `from` falls back to the baseline price.
        await tx.alert.create({ data: { ...base, kind: "PRICE_DROP", detail: { from: prev.price ?? w.baselinePrice.toNumber(), to: now.price } } });
        alertsCreated++;
      }
      const stockFlipped = await flip("stockCondMet", met.stockCondMet);
      // Already low: the drop from some stock to none is its own alert.
      const soldOut = !stockFlipped && met.stockCondMet && prev.stock > 0 && now.stock === 0;
      if (stockFlipped || soldOut) {
        const kind = alertKindForStock(now.stock);
        await tx.alert.create({
          data: { ...base, kind: kind === "low_size" ? "LOW_SIZE" : "OUT_OF_STOCK", detail: { qty: now.stock } },
        });
        alertsCreated++;
      }
    }
    return { alertsCreated };
  }, { timeout: 15000 });
}

/** Demo prices are invented, so they run only in demo mode on a non-production database. */
export const refreshSource = (): ((listings: Listing[]) => ListingUpdate[]) => (demoEnabled() ? demoSource : currentSource);

/** Refreshes the items in turn and totals the alerts. */
// ponytail: sequential, one transaction per item; batch or fan out beyond a few hundred items
export async function refreshItems(
  itemIds: string[],
  source: (listings: Listing[]) => ListingUpdate[],
): Promise<{ items: number; alertsCreated: number }> {
  let alertsCreated = 0;
  for (const id of itemIds) alertsCreated += (await applyRefresh(id, source)).alertsCreated;
  return { items: itemIds.length, alertsCreated };
}
