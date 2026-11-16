import { alertKindForStock, currentForSize, evaluateWatch } from "@/lib/alerts";
import { toListingsAndStores } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const MAX_WATCHES_PER_USER = 10;
export const REFRESH_COOLDOWN_MS = 5 * 60_000;

export type ListingUpdate = { listingId: string; price: number; stockBySize: Record<string, number> };

/**
 * Applies new prices and stock, then raises alerts for the item's active watches.
 * Dedupe: an alert is created only by the call that flips a watch's cond flag from false to true.
 */
export async function applyListingUpdates(itemId: string, updates: ListingUpdate[]): Promise<{ alertsCreated: number }> {
  const sorted = [...updates].sort((a, b) => a.listingId.localeCompare(b.listingId)); // stable lock order
  return prisma.$transaction(async (tx) => {
    const load = async () => {
      const rows = await tx.listing.findMany({ where: { itemId }, include: { store: true }, orderBy: { id: "asc" } });
      return toListingsAndStores(rows);
    };
    const before = await load();
    for (const u of sorted) {
      const r = await tx.listing.updateMany({ where: { id: u.listingId, itemId }, data: { price: u.price, stockBySize: u.stockBySize } });
      if (r.count === 1) await tx.priceHistory.create({ data: { listingId: u.listingId, price: u.price } });
    }
    const after = await load();
    const watches = await tx.watch.findMany({ where: { itemId, active: true }, orderBy: { id: "asc" } });

    let alertsCreated = 0;
    for (const w of watches) {
      const prev = currentForSize(before.listings, before.stores, w.size);
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
      if (await flip("priceCondMet", met.priceCondMet)) {
        await tx.alert.create({ data: { ...base, kind: "PRICE_DROP", detail: { from: prev.price ?? w.baselinePrice.toNumber(), to: now.price } } });
        alertsCreated++;
      }
      if (await flip("stockCondMet", met.stockCondMet)) {
        const kind = alertKindForStock(now.stock);
        await tx.alert.create({
          data: { ...base, kind: kind === "low_size" ? "LOW_SIZE" : "OUT_OF_STOCK", detail: { qty: now.stock } },
        });
        alertsCreated++;
      }
    }
    return { alertsCreated };
  });
}
