import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as REFRESH } from "@/app/api/items/[id]/refresh/route";
import { applyListingUpdates, REFRESH_COOLDOWN_MS } from "@/lib/refresh";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "./helpers/api";
import { signInAs } from "./helpers/auth";
import { resetDb } from "./helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;
let itemId: string;
let fbm: string; // cheapest Samba listing in size 9 (60, used)

const setPrice = (price: number) => [{ listingId: fbm, price, stockBySize: { "8": 0, "9": 1, "10": 0 } }];
const alertCount = (where = {}) => prisma.alert.count({ where: { userId: a, ...where } });

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  const item = await prisma.item.findFirstOrThrow({ where: { userId: a, name: "Adidas Samba OG" } });
  itemId = item.id;
  fbm = (await prisma.listing.findFirstOrThrow({ where: { itemId, storeId: "store-fbm" } })).id;
  signInAs(a);
});

const watch = (data: Record<string, unknown> = {}) =>
  prisma.watch.create({ data: { userId: a, itemId, size: "9", targetPrice: 55, lowStockAt: 0, baselinePrice: 60, ...data } });

describe("applyListingUpdates", () => {
  it("updates listings, records history and alerts once for the same updates applied twice", async () => {
    await watch();
    const before = await prisma.priceHistory.count({ where: { listingId: fbm } });
    expect((await applyListingUpdates(itemId, setPrice(50))).alertsCreated).toBe(1);
    expect((await applyListingUpdates(itemId, setPrice(50))).alertsCreated).toBe(0);
    expect(await alertCount()).toBe(1);
    expect(Number((await prisma.listing.findUniqueOrThrow({ where: { id: fbm } })).price)).toBe(50);
    expect(await prisma.priceHistory.count({ where: { listingId: fbm } })).toBe(before + 2);
    const alert = await prisma.alert.findFirstOrThrow({ where: { userId: a } });
    expect(alert.kind).toBe("PRICE_DROP");
    expect(alert.detail).toEqual({ from: 60, to: 50 });
  });

  it("two concurrent applies create exactly one alert", async () => {
    await watch();
    const r = await Promise.all([applyListingUpdates(itemId, setPrice(50)), applyListingUpdates(itemId, setPrice(50))]);
    expect(r.reduce((n, x) => n + x.alertsCreated, 0)).toBe(1);
    expect(await alertCount()).toBe(1);
  });

  it("alerts again after the price recovers above target and drops again", async () => {
    await watch();
    await applyListingUpdates(itemId, setPrice(50));
    await applyListingUpdates(itemId, setPrice(70));
    expect(await alertCount()).toBe(1);
    await applyListingUpdates(itemId, setPrice(50));
    expect(await alertCount()).toBe(2);
  });

  it("alerts out_of_stock when every listing runs out in the size", async () => {
    await watch({ targetPrice: 1, lowStockAt: 3 });
    const listings = await prisma.listing.findMany({ where: { itemId } });
    const zero = listings.map((l) => ({ listingId: l.id, price: Number(l.price), stockBySize: { "8": 0, "9": 0, "10": 0 } }));
    expect((await applyListingUpdates(itemId, zero)).alertsCreated).toBe(1);
    const alert = await prisma.alert.findFirstOrThrow({ where: { userId: a } });
    expect(alert.kind).toBe("OUT_OF_STOCK");
    expect(alert.detail).toEqual({ qty: 0 });
  });

  it("a deleted watch creates no alert and old alerts keep their row with watchId null", async () => {
    const w = await watch();
    await applyListingUpdates(itemId, setPrice(50));
    await prisma.watch.delete({ where: { id: w.id } });
    await applyListingUpdates(itemId, setPrice(70));
    await applyListingUpdates(itemId, setPrice(50));
    const alerts = await prisma.alert.findMany({ where: { userId: a } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].watchId).toBeNull();
  });

  it("ignores inactive watches", async () => {
    await watch({ active: false });
    expect((await applyListingUpdates(itemId, setPrice(50))).alertsCreated).toBe(0);
  });
});

describe("POST /api/items/[id]/refresh", () => {
  const post = (id = itemId) => REFRESH(req(`/api/items/${id}/refresh`, "POST"), ctx(id));

  it("401 without a session", async () => {
    signInAs(null);
    expect((await post()).status).toBe(401);
  });

  it("404 for another user's item, even when it was just refreshed", async () => {
    signInAs(b);
    expect((await post()).status).toBe(404);
    expect((await post()).status).toBe(404);
  });

  it("refreshes, returns the comparison and starts the cooldown", async () => {
    await prisma.item.update({ where: { id: itemId }, data: { lastRefreshedAt: null } });
    await watch({ targetPrice: 90 });
    const res = await post();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.alertsCreated).toBe(1);
    expect(data.comparison.item.id).toBe(itemId);
    expect(data.comparison.listings.find((l: { id: string }) => l.id === fbm).price).toBe(54);
    const row = await prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    expect(Date.now() - row.lastRefreshedAt!.getTime()).toBeLessThan(REFRESH_COOLDOWN_MS);
    const again = await post();
    expect(again.status).toBe(429);
    expect((await again.json()).error.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("two concurrent refreshes: one 200, one 429", async () => {
    await prisma.item.update({ where: { id: itemId }, data: { lastRefreshedAt: new Date(Date.now() - 2 * REFRESH_COOLDOWN_MS) } });
    const res = await Promise.all([post(), post()]);
    expect(res.map((r) => r.status).sort()).toEqual([200, 429]);
    const limited = res.find((r) => r.status === 429)!;
    expect((await limited.json()).error.retryAfterSeconds).toBeGreaterThan(0);
  });
});
