import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generateDemoListings } from "@/lib/demoListings";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Shared demo data that is safe on every database, production included: the stores, a set of demo promo
 * codes, and demo listings for items that have none. It never deletes a row. It keeps the 8 stores' details
 * up to date, adds only codes that are missing (so a code someone marked dead stays dead), and never touches
 * users, watches or alerts. `vercel-build` runs it after `prisma migrate deploy`. See AGENTS.md (Environments).
 */

type S = [id: string, name: string, domain: string, seller: string, https: boolean, photos: number, rating: number, fictional: boolean, cashbackPct: number];
export const STORES: S[] = [
  ["store-amazon", "Amazon", "amazon.com", "Amazon Retail", true, 950, 4.5, false, 3],
  ["store-walmart", "Walmart", "walmart.com", "Walmart Retail", true, 610, 4.3, false, 2],
  ["store-target", "Target", "target.com", "Target Retail", true, 540, 4.4, false, 0],
  ["store-ae", "American Eagle", "ae.com", "American Eagle Official", true, 210, 4.2, false, 0],
  ["store-br", "Banana Republic", "bananarepublic.com", "Banana Republic Official", true, 130, 4.1, false, 0],
  ["store-adidas", "Adidas", "adidas.com", "Adidas Official", true, 420, 4.7, false, 5],
  ["store-fbm", "Facebook Marketplace", "facebook.com", "Individual sellers", true, 35, 3.8, false, 0],
  ["store-kickswap", "KickSwap (fictional demo store)", "kickswap.example", "KickSwap Resale", false, 4, 2.9, true, 0],
];

// Real stores get their own search page for the item. Fictional stores use a reserved .example domain.
export const SEARCH: Record<string, (q: string) => string> = {
  "store-amazon": (q) => `https://www.amazon.com/s?k=${q}`,
  "store-walmart": (q) => `https://www.walmart.com/search?q=${q}`,
  "store-target": (q) => `https://www.target.com/s?searchTerm=${q}`,
  "store-ae": (q) => `https://www.ae.com/us/en/search?q=${q}`,
  "store-br": (q) => `https://bananarepublic.gap.com/browse/search.do?searchText=${q}`,
  "store-adidas": (q) => `https://www.adidas.com/us/search?q=${q}`,
  "store-fbm": (q) => `https://www.facebook.com/marketplace/search?query=${q}`,
  "store-kickswap": (q) => `https://kickswap.example/search?q=${q}`,
};

export type CatalogCode = {
  storeId: string;
  code: string;
  label: string;
  type: "PCT" | "FLAT";
  value: number;
  minSpend?: number;
  firstOrderOnly?: boolean;
};

// Demo codes for the live site. Codes are demo data everywhere (CODES_ARE_DEMO), so every screen that
// shows them carries the Demo data badge.
export const CATALOG_CODES: CatalogCode[] = [
  { storeId: "store-adidas", code: "SAMBA20", label: "20% off", type: "PCT", value: 20 },
  { storeId: "store-amazon", code: "SAVE25", label: "$25 off orders of $150 or more", type: "FLAT", value: 25, minSpend: 150 },
  { storeId: "store-walmart", code: "SAVE10", label: "10% off", type: "PCT", value: 10 },
  { storeId: "store-target", code: "TARGET10", label: "$10 off orders of $50 or more", type: "FLAT", value: 10, minSpend: 50 },
  { storeId: "store-ae", code: "WELCOME15", label: "15% off your first order", type: "PCT", value: 15, firstOrderOnly: true },
  { storeId: "store-br", code: "BR10", label: "10% off", type: "PCT", value: 10 },
];

/** Creates the stores, or brings their details up to date. Stores are shared reference data. */
export async function upsertStores(db: Prisma.TransactionClient): Promise<number> {
  for (const [id, name, domain, sellerName, isHttps, photoReviewCount, rating, fictional, pct] of STORES) {
    const data = {
      name, domain, sellerName, isHttps, photoReviewCount, rating, fictional,
      cashback: pct ? [{ provider: "DemoCash", ratePct: pct }] : [],
    };
    await db.store.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
  return STORES.length;
}

export type CatalogResult = { stores: number; codesAdded: number; itemsFilled: number };

export async function loadCatalog(db: PrismaClient): Promise<CatalogResult> {
  const { stores, codesAdded } = await db.$transaction(async (tx) => {
    const stores = await upsertStores(tx);
    // skipDuplicates on (storeId, code): an existing code, live or dead, is left exactly as it is.
    const { count: codesAdded } = await tx.code.createMany({
      data: CATALOG_CODES.map((c) => ({
        storeId: c.storeId, code: c.code, label: c.label, type: c.type, value: c.value,
        minSpend: c.minSpend ?? null, firstOrderOnly: c.firstOrderOnly ?? false,
        // No one has checked these demo codes, so they get no check time. The Codes screen tags them.
        status: "LIVE" as const, lastCheckedAt: null,
      })),
      skipDuplicates: true,
    });
    return { stores, codesAdded };
  }, { timeout: 30000 });

  // Items saved while there were no stores never got listings. Give them the same demo listings a new item gets.
  // Same store order as POST /api/items, so an item gets the same demo listings either way.
  const storeIds = (await db.store.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map((s) => s.id);
  const empty = await db.item.findMany({ where: { listings: { none: {} } } });
  let itemsFilled = 0;
  for (const item of empty) {
    const listings = generateDemoListings({ ...item, typicalPrice: Number(item.typicalPrice) }, storeIds);
    try {
      // skipDuplicates: if the item got listings in the meantime, its existing rows stay.
      const { count } = await db.listing.createMany({ data: listings.map((l) => ({ ...l, itemId: item.id })), skipDuplicates: true });
      if (count > 0) itemsFilled++;
    } catch (e) {
      // The item was deleted after it was read. Skip it rather than fail the deploy.
      if ((e as { code?: unknown })?.code !== "P2003") throw e;
    }
  }
  return { stores, codesAdded, itemsFilled };
}

// realpath both sides so a symlinked path still runs it.
const isMain = (() => {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  void (async () => {
    // Same env files as the Prisma CLI (prisma.config.ts), so `npm run db:catalog` finds .env.local. On Vercel there are none.
    const { loadEnvConfig } = await import("@next/env");
    loadEnvConfig(process.cwd(), true);
    const { prisma } = await import("@/lib/prisma");
    try {
      const r = await loadCatalog(prisma);
      console.log(`catalog: ${r.stores} stores, ${r.codesAdded} codes added, ${r.itemsFilled} items given demo listings`);
    } catch (e) {
      // Fail the build, so a deploy never ships with half the catalog. The message has no connection details.
      const code = (e as { code?: unknown })?.code;
      console.error(`catalog: failed (${typeof code === "string" ? code : e instanceof Error ? e.name : "unknown error"})`);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  })();
}
