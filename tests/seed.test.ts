import { beforeEach, describe, expect, it, vi } from "vitest";
import { seed } from "@/prisma/seed";
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

  it("refuses to run when DB_TARGET=production", async () => {
    await seed(prisma);
    const before = await counts();
    vi.stubEnv("DB_TARGET", "production");
    await expect(seed(prisma)).rejects.toThrow(/DB_TARGET/);
    vi.unstubAllEnvs();
    expect(await counts()).toEqual(before);
  });
});
