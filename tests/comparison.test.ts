// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadComparison } from "@/lib/comparison";
import * as pricing from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { resetDb } from "./helpers/db";

vi.mock("@/lib/pricing", async (orig) => {
  const actual = await orig<typeof import("@/lib/pricing")>();
  return { ...actual, bestTotal: vi.fn(actual.bestTotal), bestDeal: vi.fn(actual.bestDeal) };
});

beforeEach(async () => {
  await resetDb();
});

describe("loadComparison", () => {
  it("uses one instant for bestTotal and bestDeal", async () => {
    const userId = (await seed(prisma)).demoUserId;
    const item = await prisma.item.findFirstOrThrow({ where: { userId } });
    vi.mocked(pricing.bestTotal).mockClear();
    vi.mocked(pricing.bestDeal).mockClear();
    await loadComparison(item.id, userId);
    const nows = [
      ...vi.mocked(pricing.bestTotal).mock.calls.map((c) => c[4]),
      ...vi.mocked(pricing.bestDeal).mock.calls.map((c) => c[5]),
    ];
    expect(nows.length).toBeGreaterThan(1);
    expect(nows.every((n) => n instanceof Date && n === nows[0])).toBe(true);
  });

  it("works out each listing's total once, and picks both best deals from those totals", async () => {
    const userId = (await seed(prisma)).demoUserId;
    const item = await prisma.item.findFirstOrThrow({ where: { userId, name: "Denim jacket" }, include: { listings: true } });
    vi.mocked(pricing.bestTotal).mockClear();
    const c = (await loadComparison(item.id, userId))!;
    expect(pricing.bestTotal).toHaveBeenCalledTimes(item.listings.length);
    // Target's TGT50 takes its total to $0, so it is both the best deal and the best trusted deal.
    const target = c.listings.find((l) => l.storeId === "store-target")?.id;
    expect(c.bestDeal?.listingId).toBe(target);
    expect(c.bestTrustedDeal).toEqual(c.bestDeals.find((d) => d.listingId === target));
  });
});
