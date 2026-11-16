import { alertKindForStock, currentForSize, evaluateWatch } from "@/lib/alerts";
import { demoSource } from "@/lib/demoSource";
import { toListingsAndStores } from "@/lib/dto";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Listing, Store } from "@/lib/types";
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
 * Applies new prices and stock, then raises alerts for the item's active watches.
 * Dedupe: an alert is created only by the call that flips a watch's cond flag from false to true.
 * `before` is the item's listings as the caller loaded them; without it they are read under a lock on the item.
 */
export async function applyListingUpdates(
  itemId: string,
  updates: ListingUpdate[],
  before?: { listings: Listing[]; stores: Store[] },
): Promise<{ alertsCreated: number }> {
  const sorted = [...updates].sort((a, b) => a.listingId.localeCompare(b.listingId)); // stable lock order
  return prisma.$transaction(async (tx) => {
    const load = async () => {
      const rows = await tx.listing.findMany({ where: { itemId }, include: { store: true }, orderBy: { id: "asc" } });
      return toListingsAndStores(rows);
    };
    // Serialises concurrent appliers so the snapshot is the state they actually replace.
    if (!before) await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ${itemId} FOR UPDATE`;
    const snapshot = before ?? (await load());
    const recorded: { listingId: string; price: number }[] = [];
    for (const u of sorted) {
      const r = await tx.listing.updateMany({ where: { id: u.listingId, itemId }, data: { price: u.price, stockBySize: u.stockBySize } });
      if (r.count === 1) recorded.push({ listingId: u.listingId, price: u.price });
    }
    await tx.priceHistory.createMany({ data: recorded });
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
      if (await flip("priceCondMet", met.priceCondMet)) {
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

/** Demo prices are invented, so they run only in demo mode. */
export const refreshSource = (): ((listings: Listing[]) => ListingUpdate[]) =>
  process.env.DEMO_MODE === "true" ? demoSource : currentSource;

type ItemWithListings = Prisma.ItemGetPayload<{ include: { listings: { include: { store: true } } } }>;

/** Applies the source to each item in turn and totals the alerts. */
// ponytail: sequential, one transaction per item; batch or fan out beyond a few hundred items
export async function refreshItems(
  items: ItemWithListings[],
  source: (listings: Listing[]) => ListingUpdate[],
): Promise<{ items: number; alertsCreated: number }> {
  let alertsCreated = 0;
  for (const item of items) {
    const snapshot = toListingsAndStores(item.listings);
    alertsCreated += (await applyListingUpdates(item.id, source(snapshot.listings), snapshot)).alertsCreated;
  }
  return { items: items.length, alertsCreated };
}

/** Stub: reads the listings outside the transaction. */
export async function applyRefresh(
  itemId: string,
  source: (listings: Listing[]) => ListingUpdate[],
): Promise<{ alertsCreated: number }> {
  const rows = await prisma.listing.findMany({ where: { itemId }, include: { store: true }, orderBy: { id: "asc" } });
  const snapshot = toListingsAndStores(rows);
  return applyListingUpdates(itemId, source(snapshot.listings), snapshot);
}
