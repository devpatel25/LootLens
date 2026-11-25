import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assertNonProdDb } from "@/lib/db-guard";
import { SEARCH, upsertStores } from "@/prisma/catalog";
import type { PrismaClient } from "@/lib/generated/prisma/client";

type L = [store: string, price: number, condition: "NEW" | "USED" | "RESALE", stock: Record<string, number>];
type I = { name: string; category: string; sizes: string[]; selectedSize: string; typicalPrice: number; listings: L[] };
const ITEMS: I[] = [
  {
    name: "Adidas Samba OG", category: "shoes", sizes: ["8", "9", "10"], selectedSize: "9", typicalPrice: 100,
    listings: [
      ["store-adidas", 100, "NEW", { "8": 6, "9": 4, "10": 0 }],
      ["store-amazon", 84.99, "NEW", { "8": 3, "9": 0, "10": 2 }],
      ["store-walmart", 92.5, "NEW", { "8": 1, "9": 2, "10": 5 }],
      ["store-fbm", 60, "USED", { "8": 0, "9": 1, "10": 0 }],
      ["store-kickswap", 118, "RESALE", { "8": 2, "9": 3, "10": 1 }],
    ],
  },
  {
    name: "Mechanical keyboard", category: "tech", sizes: ["One size"], selectedSize: "One size", typicalPrice: 85,
    listings: [
      ["store-amazon", 79.99, "NEW", { "One size": 12 }],
      ["store-fbm", 79.99, "USED", { "One size": 1 }],
      ["store-walmart", 89, "NEW", { "One size": 6 }],
      ["store-target", 94.99, "NEW", { "One size": 2 }],
    ],
  },
  {
    name: "Denim jacket", category: "clothes", sizes: ["S", "M", "L"], selectedSize: "M", typicalPrice: 65,
    listings: [
      ["store-kickswap", 29, "RESALE", { S: 1, M: 2, L: 1 }],
      ["store-target", 39, "NEW", { S: 4, M: 3, L: 5 }],
      ["store-ae", 59.95, "NEW", { S: 2, M: 4, L: 0 }],
      ["store-br", 89.5, "NEW", { S: 1, M: 2, L: 2 }],
    ],
  },
];

const H = 3_600_000;
type C = [id: string, store: string, code: string, label: string, type: "PCT" | "FLAT", value: number, status: "LIVE" | "DEAD", checkedHoursAgo: number, extra?: { minSpend?: number; firstOrderOnly?: boolean; expiresInHours?: number }];
const CODES: C[] = [
  ["code-adidas-20", "store-adidas", "SAMBA20", "20% off", "PCT", 20, "LIVE", 1],
  // Checked 30 hours ago, so outside the default 24h freshness window.
  ["code-walmart-10", "store-walmart", "SAVE10", "10% off", "PCT", 10, "LIVE", 30],
  // Marked dead.
  ["code-amazon-dead", "store-amazon", "DEADDEAL", "15% off", "PCT", 15, "DEAD", 2],
  ["code-amazon-25", "store-amazon", "SAVE25", "$25 off orders of $150 or more", "FLAT", 25, "LIVE", 2, { minSpend: 150 }],
  ["code-ae-first15", "store-ae", "WELCOME15", "15% off your first order", "PCT", 15, "LIVE", 3, { firstOrderOnly: true }],
  // Live, but its end date has passed.
  ["code-target-expired", "store-target", "TGT20", "20% off", "PCT", 20, "LIVE", 1, { expiresInHours: -1 }],
  ["code-target-50", "store-target", "TGT50", "$50 off", "FLAT", 50, "LIVE", 2],
  ["code-br-10", "store-br", "BR10", "10% off", "PCT", 10, "LIVE", 4],
];

export async function seed(db: PrismaClient, now = new Date()): Promise<{ demoUserId: string }> {
  assertNonProdDb();
  const ago = (h: number) => new Date(now.getTime() - h * H);

  // One transaction: a failed re-seed leaves the previous data in place.
  const demoUserId = await db.$transaction(
    async (tx) => {
      const demo = await tx.user.upsert({
        where: { email: "demo@lootlens.test" },
        update: { name: "Demo Shopper" },
        create: { email: "demo@lootlens.test", name: "Demo Shopper" },
      });
      await tx.userSettings.upsert({ where: { userId: demo.id }, update: {}, create: { userId: demo.id } });

      // The same stores the live site gets (prisma/catalog.ts).
      await upsertStores(tx);

      // Seed-owned data is replaced, never truncated: real users in previews keep their rows.
      await tx.item.deleteMany({ where: { userId: demo.id } });
      // By id, and by store and code text: the catalog (prisma/catalog.ts) may have added the same codes.
      await tx.code.deleteMany({
        where: { OR: [{ id: { in: CODES.map((c) => c[0]) } }, ...CODES.map(([, storeId, code]) => ({ storeId, code }))] },
      });

      for (const it of ITEMS) {
        await tx.item.create({
          data: {
            userId: demo.id,
            name: it.name,
            category: it.category,
            sizes: it.sizes,
            selectedSize: it.selectedSize,
            typicalPrice: it.typicalPrice,
            lastRefreshedAt: ago(2),
            listings: {
              create: it.listings.map(([storeId, price, condition, stock]) => ({
                storeId,
                price,
                condition,
                stockBySize: stock,
                source: "DEMO" as const,
                url: SEARCH[storeId](encodeURIComponent(it.name)),
                priceHistory: { create: [{ price: price * 1.05, recordedAt: ago(72) }, { price, recordedAt: ago(1) }] },
              })),
            },
          },
        });
      }

      await tx.code.createMany({
        data: CODES.map(([id, storeId, code, label, type, value, status, h, x]) => ({
          id, storeId, code, label, type, value, status,
          minSpend: x?.minSpend ?? null,
          firstOrderOnly: x?.firstOrderOnly ?? false,
          expiresAt: x?.expiresInHours === undefined ? null : ago(-x.expiresInHours),
          lastCheckedAt: ago(h),
        })),
      });

      return demo.id;
    },
    { timeout: 30000 },
  );

  return { demoUserId };
}

// realpath both sides so a symlinked path still runs the seed.
const isMain = (() => {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  void (async () => {
    const { prisma } = await import("@/lib/prisma");
    await seed(prisma);
    await prisma.$disconnect();
  })();
}
