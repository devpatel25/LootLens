import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { CATALOG_CODES, loadCatalog, refreshDemoCodes } from "@/prisma/catalog";
import { seed } from "@/prisma/seed";
import { resetDb } from "@/tests/helpers/db";

const H = 3_600_000;
const NOW = new Date("2026-11-20T12:00:00Z");

async function counts() {
  return {
    users: await prisma.user.count(),
    stores: await prisma.store.count(),
    items: await prisma.item.count(),
    listings: await prisma.listing.count(),
    codes: await prisma.code.count(),
    watches: await prisma.watch.count(),
    alerts: await prisma.alert.count(),
  };
}

const newUser = (email: string) => prisma.user.create({ data: { email } });
const emptyItem = (userId: string, name = "Nike Air Force 1") =>
  prisma.item.create({ data: { userId, name, category: "shoes", sizes: ["9", "10"], selectedSize: "9", typicalPrice: 110 } });

beforeEach(async () => {
  await resetDb();
});

describe("loadCatalog on an empty database (the live site today)", () => {
  it("adds the 8 stores, with the one fictional store labelled", async () => {
    const r = await loadCatalog(prisma, NOW);
    expect(r.stores).toBe(8);
    expect(await prisma.store.count()).toBe(8);
    const fictional = await prisma.store.findMany({ where: { fictional: true } });
    expect(fictional.map((s) => s.name)).toEqual(["KickSwap (fictional demo store)"]);
  });

  it("adds every demo code as live and checked now, with no end date", async () => {
    const r = await loadCatalog(prisma, NOW);
    expect(r.codesAdded).toBe(CATALOG_CODES.length);
    const codes = await prisma.code.findMany();
    expect(codes).toHaveLength(CATALOG_CODES.length);
    for (const c of codes) {
      expect(c).toMatchObject({ status: "LIVE", expiresAt: null, lastCheckedById: null });
      expect(c.lastCheckedAt.toISOString()).toBe(NOW.toISOString());
    }
  });

  it("works with DB_TARGET=production, because it only adds", async () => {
    vi.stubEnv("DB_TARGET", "production");
    try {
      expect((await loadCatalog(prisma, NOW)).stores).toBe(8);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("gives demo listings to an item that has none, in stock in its saved size", async () => {
    const u = await newUser("shopper@lootlens.test");
    const item = await emptyItem(u.id);
    const r = await loadCatalog(prisma, NOW);
    expect(r.itemsFilled).toBe(1);
    const listings = await prisma.listing.findMany({ where: { itemId: item.id } });
    expect(listings.length).toBeGreaterThanOrEqual(3);
    expect(listings.every((l) => l.source === "DEMO")).toBe(true);
    expect(listings.some((l) => (l.stockBySize as Record<string, number>)["9"] > 0)).toBe(true);
  });

  it("running it twice changes nothing the second time", async () => {
    const u = await newUser("shopper@lootlens.test");
    await emptyItem(u.id);
    await loadCatalog(prisma, NOW);
    const first = await counts();
    expect(await loadCatalog(prisma, NOW)).toEqual({ stores: 8, codesAdded: 0, itemsFilled: 0 });
    expect(await counts()).toEqual(first);
  });
});

describe("loadCatalog only adds", () => {
  it("never deletes, never revives a dead code, and never touches users, watches or alerts", async () => {
    const { demoUserId } = await seed(prisma);
    const samba = await prisma.item.findFirstOrThrow({ where: { userId: demoUserId, name: "Adidas Samba OG" } });
    const watch = await prisma.watch.create({
      data: { userId: demoUserId, itemId: samba.id, size: "9", targetPrice: null, lowStockAt: 1, baselinePrice: 60 },
    });
    await prisma.alert.create({ data: { userId: demoUserId, itemId: samba.id, watchId: watch.id, size: "9", kind: "PRICE_DROP", detail: { from: 60, to: 55 } } });
    // Someone marked the seed's SAMBA20 dead; the catalog has a code with the same text for that store.
    await prisma.code.update({ where: { id: "code-adidas-20" }, data: { status: "DEAD" } });
    const codesBefore = await prisma.code.findMany({ orderBy: { id: "asc" } });
    const listingsBefore = await prisma.listing.findMany({ where: { itemId: samba.id }, orderBy: { id: "asc" } });
    const before = await counts();

    await loadCatalog(prisma, NOW);

    const after = await counts();
    expect({ ...after, codes: before.codes, listings: before.listings }).toEqual(before);
    expect(after.codes).toBeGreaterThanOrEqual(before.codes);
    expect(after.listings).toBe(before.listings);
    const codesAfter = await prisma.code.findMany({ where: { id: { in: codesBefore.map((c) => c.id) } }, orderBy: { id: "asc" } });
    expect(codesAfter).toEqual(codesBefore);
    expect(await prisma.listing.findMany({ where: { itemId: samba.id }, orderBy: { id: "asc" } })).toEqual(listingsBefore);
  });
});

describe("refreshDemoCodes (the daily cron keeps demo codes fresh)", () => {
  it("re-checks live demo codes, and skips dead, expired and other codes", async () => {
    // Seeded 30 hours ago, so every seed code is outside the default window.
    await seed(prisma, new Date(NOW.getTime() - 30 * H));
    const other = await prisma.code.create({
      data: { storeId: "store-amazon", code: "NOTDEMO", label: "5% off", type: "PCT", value: 5, status: "LIVE", lastCheckedAt: new Date(NOW.getTime() - 30 * H) },
    });
    await prisma.code.update({ where: { id: "code-br-10" }, data: { status: "DEAD" } });
    await prisma.code.update({ where: { id: "code-walmart-10" }, data: { expiresAt: new Date(NOW.getTime() - H) } });
    const before = new Map((await prisma.code.findMany()).map((c) => [c.id, c.lastCheckedAt.toISOString()]));

    // Live demo codes in the seed: SAMBA20, SAVE25, WELCOME15 (BR10 is now dead, SAVE10 has ended).
    expect(await refreshDemoCodes(prisma, NOW)).toBe(3);

    const after = await prisma.code.findMany();
    const changed = after.filter((c) => c.lastCheckedAt.toISOString() !== before.get(c.id)).map((c) => c.code).sort();
    expect(changed).toEqual(["SAMBA20", "SAVE25", "WELCOME15"]);
    expect(after.filter((c) => changed.includes(c.code)).every((c) => c.lastCheckedAt.toISOString() === NOW.toISOString())).toBe(true);
    expect(after.find((c) => c.id === other.id)?.lastCheckedAt.toISOString()).toBe(before.get(other.id));
  });
});

describe("deploy", () => {
  it("vercel-build fills the catalog after migrations and before the app is built", () => {
    const build: string = JSON.parse(readFileSync("package.json", "utf8")).scripts["vercel-build"];
    const steps = build.split("&&").map((s) => s.trim());
    const migrate = steps.indexOf("prisma migrate deploy");
    const catalog = steps.indexOf("tsx prisma/catalog.ts");
    const next = steps.indexOf("next build");
    expect(migrate).toBeGreaterThan(-1);
    expect(catalog).toBeGreaterThan(migrate);
    expect(next).toBeGreaterThan(catalog);
  });
});
