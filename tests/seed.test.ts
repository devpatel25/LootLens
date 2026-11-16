import { beforeEach, describe, expect, it, vi } from "vitest";
import { seed } from "@/prisma/seed";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/tests/helpers/db";

async function counts() {
  return {
    stores: await prisma.store.count(),
    items: await prisma.item.count(),
    listings: await prisma.listing.count(),
    codes: await prisma.code.count(),
  };
}

describe("seed", () => {
  beforeEach(resetDb);

  it("creates 8 stores with exactly one fictional store", async () => {
    await seed(prisma);
    expect(await prisma.store.count()).toBe(8);
    const fictional = await prisma.store.findMany({ where: { fictional: true } });
    expect(fictional).toHaveLength(1);
    expect(fictional[0].name).toContain("fictional");
  });

  it("gives the demo user 3 items and labels every listing DEMO", async () => {
    const { demoUserId } = await seed(prisma);
    expect(await prisma.item.count({ where: { userId: demoUserId } })).toBe(3);
    expect(await prisma.listing.count()).toBeGreaterThan(0);
    expect(await prisma.listing.count({ where: { source: { not: "DEMO" } } })).toBe(0);
  });

  it("is idempotent", async () => {
    await seed(prisma);
    const first = await counts();
    await seed(prisma);
    expect(await counts()).toEqual(first);
    expect(first.codes).toBeGreaterThanOrEqual(8);
  });

  it("keeps codes it does not own when re-seeding", async () => {
    await seed(prisma);
    await prisma.code.create({
      data: {
        id: "ingested-1", storeId: "store-amazon", code: "INGESTED", label: "ingested",
        type: "PCT", value: 5, status: "LIVE", lastCheckedAt: new Date(),
      },
    });
    await seed(prisma);
    expect(await prisma.code.findUnique({ where: { id: "ingested-1" } })).not.toBeNull();
  });

  it("uses plain user-facing code labels, no scenario notes", async () => {
    await seed(prisma);
    const codes = await prisma.code.findMany();
    for (const c of codes) {
      expect(c.label).not.toMatch(/checked|expired|dead|end date|ago|marked/i);
    }
  });

  it("links listings to store search pages, never invented product paths", async () => {
    await seed(prisma);
    const listings = await prisma.listing.findMany({ include: { store: true, item: true } });
    expect(listings.length).toBeGreaterThan(0);
    for (const l of listings) {
      const url = new URL(l.url);
      expect(url.protocol).toBe("https:");
      expect(url.pathname).not.toContain("/demo");
      expect(decodeURIComponent(url.search + url.pathname)).toContain(l.item.name);
      if (l.store.fictional) expect(url.hostname.endsWith(".example")).toBe(true);
      else expect(url.hostname.endsWith(".example")).toBe(false);
    }
  });

  async function otherUserData() {
    const user = await prisma.user.create({ data: { email: "other@example.com" } });
    await prisma.userSettings.create({ data: { userId: user.id, freshnessHours: 48 } });
    const item = await prisma.item.create({
      data: {
        userId: user.id, name: "Mine", category: "shoes", sizes: ["9"], selectedSize: "9", typicalPrice: 50,
        listings: {
          create: [{ storeId: "store-amazon", url: "https://www.amazon.com/s?k=Mine", price: 40, stockBySize: { "9": 1 }, condition: "NEW" }],
        },
      },
    });
    const watch = await prisma.watch.create({
      data: { userId: user.id, itemId: item.id, size: "9", baselinePrice: 50 },
    });
    await prisma.alert.create({
      data: { userId: user.id, itemId: item.id, watchId: watch.id, size: "9", kind: "PRICE_DROP", detail: {} },
    });
    return user.id;
  }
  const otherCounts = (userId: string) =>
    Promise.all([
      prisma.item.count({ where: { userId } }),
      prisma.listing.count({ where: { item: { userId } } }),
      prisma.watch.count({ where: { userId } }),
      prisma.alert.count({ where: { userId } }),
      prisma.userSettings.count({ where: { userId } }),
    ]);

  it("keeps another user's items, watches, alerts and settings when re-seeding", async () => {
    await seed(prisma);
    const otherId = await otherUserData();
    await seed(prisma);
    expect(await otherCounts(otherId)).toEqual([1, 1, 1, 1, 1]);
    expect((await prisma.alert.findFirstOrThrow({ where: { userId: otherId } })).size).toBe("9");
  });

  it("rolls back everything when the seed fails part way", async () => {
    await seed(prisma);
    const before = await counts();
    // Fails after the demo items were deleted and re-created, at the last write.
    const failing = {
      $transaction: (fn: (tx: unknown) => Promise<unknown>, opts?: object) =>
        prisma.$transaction(
          (tx) =>
            fn(
              new Proxy(tx, {
                get: (t, k) =>
                  k === "code"
                    ? { deleteMany: t.code.deleteMany.bind(t.code), createMany: () => Promise.reject(new Error("boom")) }
                    : (t as never)[k],
              }),
            ),
          opts,
        ),
    } as unknown as PrismaClient;
    await expect(seed(failing)).rejects.toThrow("boom");
    expect(await counts()).toEqual(before);
  });

  it("does not allow two codes with the same text for one store", async () => {
    await seed(prisma);
    const dup = { storeId: "store-amazon", code: "SAVE25", label: "dup", type: "PCT" as const, value: 5, status: "LIVE" as const, lastCheckedAt: new Date() };
    await expect(prisma.code.create({ data: dup })).rejects.toThrow();
    await expect(prisma.code.create({ data: { ...dup, storeId: "store-walmart" } })).resolves.toBeTruthy();
  });

  it("labels the min spend code as 'of $150 or more'", async () => {
    await seed(prisma);
    const c = await prisma.code.findFirstOrThrow({ where: { minSpend: { not: null } } });
    expect(c.label).toBe("$25 off orders of $150 or more");
  });

  it("requires a size on every alert", async () => {
    const { demoUserId } = await seed(prisma);
    const item = await prisma.item.findFirstOrThrow({ where: { userId: demoUserId } });
    const data = { userId: demoUserId, itemId: item.id, kind: "LOW_SIZE" as const, detail: {} };
    await expect(prisma.alert.create({ data: data as never })).rejects.toThrow();
    await expect(prisma.alert.create({ data: { ...data, size: "9" } })).resolves.toBeTruthy();
  });

  it("refuses to run when DB_TARGET=production", async () => {
    await seed(prisma);
    const before = await counts();
    vi.stubEnv("DB_TARGET", "production");
    await expect(seed(prisma)).rejects.toThrow(/DB_TARGET/);
    expect(await counts()).toEqual(before);
  });
});
