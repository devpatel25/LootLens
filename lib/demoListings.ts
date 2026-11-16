import type { Prisma } from "@/lib/generated/prisma/client";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Demo listings for a new item: same name, same output. Always in stock in the selected size somewhere. */
export function generateDemoListings(
  item: { name: string; sizes: string[]; selectedSize: string; typicalPrice: number },
  storeIds: string[],
): Prisma.ListingCreateManyItemInput[] {
  const rand = mulberry32(hash(item.name));
  const pool = [...new Set(storeIds)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, 3 + Math.floor(rand() * 3));
  const usedIndex = rand() < 0.5 ? Math.floor(rand() * chosen.length) : -1;

  const out = chosen.map((storeId, i): Prisma.ListingCreateManyItemInput => {
    const price = Math.round(item.typicalPrice * (0.75 + rand() * 0.5) * 100) / 100;
    const stockBySize = Object.fromEntries(item.sizes.map((s) => [s, Math.floor(rand() * 7)]));
    const condition = i !== usedIndex ? "NEW" : rand() < 0.5 ? "USED" : "RESALE";
    // Demo domain: no real store page is implied.
    const url = `https://demo.example/${encodeURIComponent(storeId)}/search?q=${encodeURIComponent(item.name)}`;
    return { storeId, url, price, condition, stockBySize, source: "DEMO" };
  });

  if (out.length > 0 && !out.some((l) => (l.stockBySize as Record<string, number>)[item.selectedSize] > 0)) {
    (out[0].stockBySize as Record<string, number>)[item.selectedSize] = 1 + Math.floor(rand() * 6);
  }
  return out;
}

/**
 * New stockBySize for each listing (same order) after the item's sizes change: removed sizes
 * are dropped, new sizes get a seeded stock of 0 to 6, and some listing is kept in stock for the
 * selected size. Pure: the input is not changed.
 */
export function resizeStock(
  listings: { id: string; stockBySize: Record<string, number> }[],
  item: { name: string; sizes: string[]; selectedSize: string },
): Record<string, number>[] {
  const out = listings.map((l) =>
    Object.fromEntries(
      item.sizes.map((size) => [size, l.stockBySize[size] ?? Math.floor(mulberry32(hash(`${item.name}|${size}|${l.id}`))() * 7)]),
    ),
  );
  if (out.length > 0 && !out.some((s) => s[item.selectedSize] > 0)) {
    out[0][item.selectedSize] = 1 + Math.floor(mulberry32(hash(`${item.name}|${item.selectedSize}|${listings[0].id}|fill`))() * 6);
  }
  return out;
}
