import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as REFRESH } from "@/app/api/items/[id]/refresh/route";
import * as refresh from "@/lib/refresh";
import { demoSource } from "@/lib/demoSource";
import { applyRefresh, currentSource, REFRESH_COOLDOWN_MS, type ListingUpdate } from "@/lib/refresh";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "./helpers/api";
import { signInAs } from "./helpers/auth";
import { resetDb } from "./helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/refresh", async (orig) => {
  const actual = await orig<typeof import("@/lib/refresh")>();
  return { ...actual, applyRefresh: vi.fn(actual.applyRefresh) };
});

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

const apply = (id: string, updates: ListingUpdate[]) => applyRefresh(id, () => updates);

const watch = (data: Record<string, unknown> = {}) =>
  prisma.watch.create({ data: { userId: a, itemId, size: "9", targetPrice: 55, lowStockAt: 0, baselinePrice: 60, ...data } });

describe("applyRefresh with fixed updates", () => {
  it("updates listings, records history and alerts once for the same updates applied twice", async () => {
    await watch();
    const before = await prisma.priceHistory.count({ where: { listingId: fbm } });
    expect((await apply(itemId, setPrice(50))).alertsCreated).toBe(1);
    expect((await apply(itemId, setPrice(50))).alertsCreated).toBe(0);
    expect(await alertCount()).toBe(1);
    expect(Number((await prisma.listing.findUniqueOrThrow({ where: { id: fbm } })).price)).toBe(50);
    // The second call changes nothing, so it records nothing.
    expect(await prisma.priceHistory.count({ where: { listingId: fbm } })).toBe(before + 1);
    const alert = await prisma.alert.findFirstOrThrow({ where: { userId: a } });
    expect(alert.kind).toBe("PRICE_DROP");
    expect(alert.detail).toEqual({ from: 60, to: 50 });
    expect(alert.size).toBe("9");
  });

  it("two concurrent applies create exactly one alert", async () => {
    await watch();
    const r = await Promise.all([apply(itemId, setPrice(50)), apply(itemId, setPrice(50))]);
    expect(r.reduce((n, x) => n + x.alertsCreated, 0)).toBe(1);
    expect(await alertCount()).toBe(1);
  });

  it("alerts again after the price recovers above target and drops again", async () => {
    await watch();
    await apply(itemId, setPrice(50));
    await apply(itemId, setPrice(70));
    expect(await alertCount()).toBe(1);
    await apply(itemId, setPrice(50));
    expect(await alertCount()).toBe(2);
  });

  it("alerts out_of_stock when every listing runs out in the size", async () => {
    await watch({ targetPrice: 1, lowStockAt: 3 });
    const listings = await prisma.listing.findMany({ where: { itemId } });
    const zero = listings.map((l) => ({ listingId: l.id, price: Number(l.price), stockBySize: { "8": 0, "9": 0, "10": 0 } }));
    expect((await apply(itemId, zero)).alertsCreated).toBe(1);
    const alert = await prisma.alert.findFirstOrThrow({ where: { userId: a } });
    expect(alert.kind).toBe("OUT_OF_STOCK");
    expect(alert.detail).toEqual({ qty: 0 });
    expect(alert.size).toBe("9");
  });

  it("a deleted watch creates no alert and old alerts keep their row with watchId null", async () => {
    const w = await watch();
    await apply(itemId, setPrice(50));
    await prisma.watch.delete({ where: { id: w.id } });
    await apply(itemId, setPrice(70));
    await apply(itemId, setPrice(50));
    const alerts = await prisma.alert.findMany({ where: { userId: a } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].watchId).toBeNull();
    expect(alerts[0].size).toBe("9");
  });

  it("ignores inactive watches", async () => {
    await watch({ active: false });
    expect((await apply(itemId, setPrice(50))).alertsCreated).toBe(0);
  });
});

describe("applyRefresh stock alerts", () => {
  // All size-9 stock sits on one listing so the total is easy to steer.
  const setStock = (n: number) => [{ listingId: fbm, price: 60, stockBySize: { "8": 0, "9": n, "10": 0 } }];
  beforeEach(async () => {
    await prisma.listing.updateMany({ where: { itemId, id: { not: fbm } }, data: { stockBySize: { "8": 0, "9": 0, "10": 0 } } });
  });

  it("5 -> 2 -> 0 gives low_size, then out_of_stock, then nothing on a repeat", async () => {
    await watch({ targetPrice: 1, lowStockAt: 3 });
    expect((await apply(itemId, setStock(5))).alertsCreated).toBe(0);
    expect((await apply(itemId, setStock(2))).alertsCreated).toBe(1);
    expect((await apply(itemId, setStock(0))).alertsCreated).toBe(1);
    expect((await apply(itemId, setStock(0))).alertsCreated).toBe(0);
    const kinds = (await prisma.alert.findMany({ where: { userId: a }, orderBy: { createdAt: "asc" } })).map((x) => x.kind);
    expect(kinds).toEqual(["LOW_SIZE", "OUT_OF_STOCK"]);
  });

  it("a watch created with the condition already true gives no alert on an unchanged refresh", async () => {
    signInAs(a);
    const { POST } = await import("@/app/api/watches/route");
    const res = await POST(req("/api/watches", "POST", { itemId, size: "9", targetPrice: 70, lowStockAt: 10 }));
    expect(res.status).toBe(201);
    const w = await prisma.watch.findFirstOrThrow({ where: { userId: a } });
    expect(w).toMatchObject({ priceCondMet: true, stockCondMet: true });
    expect((await apply(itemId, setStock(1))).alertsCreated).toBe(0);
    expect(await alertCount()).toBe(0);
  });
});

describe("applyRefresh with a watch deleted mid-refresh", () => {
  it("skips the deleted watch's alert and keeps the item's updates and the other watches' alerts", async () => {
    await prisma.listing.updateMany({ where: { itemId, id: { not: fbm } }, data: { stockBySize: { "8": 0, "9": 0, "10": 0 } } });
    await prisma.listing.update({ where: { id: fbm }, data: { stockBySize: { "8": 0, "9": 5, "10": 0 } } });
    const gone = await watch({ targetPrice: 1, lowStockAt: 3, stockCondMet: true });
    await prisma.watch.create({
      data: { userId: b, itemId, size: "9", targetPrice: 1, lowStockAt: 3, baselinePrice: 60, stockCondMet: true },
    });
    // Delete the watch right after the refresh has read its watches, before it raises alerts.
    type Tx = Prisma.TransactionClient;
    const real = prisma.$transaction.bind(prisma) as unknown as (fn: (tx: Tx) => Promise<unknown>, opts: unknown) => Promise<unknown>;
    const spy = vi.spyOn(prisma, "$transaction").mockImplementation(((fn: (tx: Tx) => Promise<unknown>, opts: unknown) =>
      real((tx) => {
        const findMany = async (args?: Prisma.WatchFindManyArgs) => {
          const rows = await tx.watch.findMany(args);
          await prisma.watch.delete({ where: { id: gone.id } });
          return rows;
        };
        return fn(new Proxy(tx, { get: (t, k) => (k === "watch" ? { ...t.watch, findMany, updateMany: t.watch.updateMany.bind(t.watch) } : Reflect.get(t, k)) }));
      }, opts)) as unknown as typeof prisma.$transaction);
    try {
      const r = await apply(itemId, [{ listingId: fbm, price: 59, stockBySize: { "8": 0, "9": 0, "10": 0 } }]);
      expect(r.alertsCreated).toBe(1);
    } finally {
      spy.mockRestore();
    }
    expect(Number((await prisma.listing.findUniqueOrThrow({ where: { id: fbm } })).price)).toBe(59);
    expect(await prisma.alert.count({ where: { userId: b, kind: "OUT_OF_STOCK" } })).toBe(1);
    expect(await prisma.alert.count({ where: { userId: a } })).toBe(0);
  });
});

describe("applyRefresh sources", () => {
  it("reports how many listings changed (price or stock), and 0 for a no-op", async () => {
    const first = await applyRefresh(itemId, demoSource);
    expect(first.listingsChanged).toBeGreaterThan(0);
    expect((await applyRefresh(itemId, currentSource)).listingsChanged).toBe(0);
  });

  it("leaves updatedAt alone for listings that did not change", async () => {
    const before = await prisma.listing.findMany({ orderBy: { id: "asc" } });
    await applyRefresh(itemId, currentSource);
    const after = await prisma.listing.findMany({ orderBy: { id: "asc" } });
    expect(after.map((l) => l.updatedAt)).toEqual(before.map((l) => l.updatedAt));
  });

  const history = () => prisma.priceHistory.count();

  it("records history only for listings whose price changed", async () => {
    const h0 = await history();
    await applyRefresh(itemId, currentSource);
    expect(await history()).toBe(h0);
    await applyRefresh(itemId, demoSource);
    expect(await history()).toBe(h0 + 5);
  });

  it("a sell-out does not reset the price flag, so a restock at the same price is quiet", async () => {
    await prisma.listing.updateMany({ where: { itemId, id: { not: fbm } }, data: { stockBySize: { "8": 0, "9": 0, "10": 0 } } });
    await prisma.listing.update({ where: { id: fbm }, data: { price: 75, stockBySize: { "8": 0, "9": 5, "10": 0 } } });
    await watch({ targetPrice: 80, lowStockAt: 0, baselinePrice: 90, priceCondMet: true });
    const stock = (n: number) => [{ listingId: fbm, price: 75, stockBySize: { "8": 0, "9": n, "10": 0 } }];
    await apply(itemId, stock(0));
    await apply(itemId, stock(5));
    expect(await alertCount({ kind: "PRICE_DROP" })).toBe(0);
    expect((await prisma.watch.findFirstOrThrow()).priceCondMet).toBe(true);
  });

  it("concurrent refreshes around a sell-out give one out_of_stock alert and apply the source to the latest state each time", async () => {
    const kb = await prisma.item.findFirstOrThrow({ where: { userId: a, name: "Mechanical keyboard" } });
    await prisma.listing.updateMany({ where: { itemId: kb.id }, data: { stockBySize: { "One size": 0 } } });
    const amazon = await prisma.listing.findFirstOrThrow({ where: { itemId: kb.id, storeId: "store-amazon" } });
    await prisma.listing.update({ where: { id: amazon.id }, data: { stockBySize: { "One size": 1 } } });
    await prisma.watch.create({
      data: { userId: a, itemId: kb.id, size: "One size", targetPrice: 1, lowStockAt: 3, baselinePrice: 79.99, stockCondMet: true },
    });
    const { POST } = await import("@/app/api/demo/simulate/route");
    const { GET } = await import("@/app/api/cron/refresh/route");
    vi.stubEnv("CRON_SECRET", "s");
    vi.stubEnv("DEMO_MODE", "true");
    await Promise.all([
      POST(req("/api/demo/simulate", "POST", { itemId: kb.id })),
      GET(new Request("http://localhost/api/cron/refresh", { headers: { authorization: "Bearer s" } })),
    ]);
    expect(await alertCount({ kind: "OUT_OF_STOCK" })).toBe(1);
    expect(Number((await prisma.listing.findUniqueOrThrow({ where: { id: amazon.id } })).price)).toBe(64.79);
  });
});

describe("POST /api/items/[id]/refresh", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "true");
  });
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
    await watch({ targetPrice: 59, lowStockAt: 6 }); // stock 10 -> 6 is a real crossing; price never reaches 59
    const res = await post();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.alertsCreated).toBe(1);
    expect(data.listingsChanged).toBeGreaterThan(0);
    expect(data.comparison.item.id).toBe(itemId);
    expect(data.comparison.listings.find((l: { id: string }) => l.id === fbm).price).toBe(54);
    const row = await prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    expect(Date.now() - row.lastRefreshedAt!.getTime()).toBeLessThan(REFRESH_COOLDOWN_MS);
    const again = await post();
    expect(again.status).toBe(429);
    const retry = (await again.json()).error.retryAfterSeconds;
    expect(retry).toBeGreaterThan(0);
    expect(again.headers.get("Retry-After")).toBe(String(retry));
  });

  it("outside demo mode nothing changes and no alert is created", async () => {
    vi.stubEnv("DEMO_MODE", undefined);
    await prisma.item.update({ where: { id: itemId }, data: { lastRefreshedAt: null } });
    await watch({ targetPrice: 59, lowStockAt: 6 });
    const before = await prisma.listing.findMany({ where: { itemId }, orderBy: { id: "asc" } });
    const res = await post();
    expect(res.status).toBe(200);
    expect((await res.json()).data.alertsCreated).toBe(0);
    const after = await prisma.listing.findMany({ where: { itemId }, orderBy: { id: "asc" } });
    expect(after.map((l) => [l.price.toString(), l.stockBySize])).toEqual(before.map((l) => [l.price.toString(), l.stockBySize]));
    expect(await alertCount()).toBe(0);
  });

  it("a failed apply gives the cooldown slot back and answers 500", async () => {
    const prev = new Date(Date.now() - 2 * REFRESH_COOLDOWN_MS);
    await prisma.item.update({ where: { id: itemId }, data: { lastRefreshedAt: prev } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(refresh.applyRefresh).mockRejectedValueOnce(new Error("boom"));
    expect((await post()).status).toBe(500);
    expect((await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).lastRefreshedAt).toEqual(prev);
    expect((await post()).status).toBe(200);
  });

  it("two concurrent refreshes: one 200, one 429", async () => {
    await prisma.item.update({ where: { id: itemId }, data: { lastRefreshedAt: new Date(Date.now() - 2 * REFRESH_COOLDOWN_MS) } });
    const res = await Promise.all([post(), post()]);
    expect(res.map((r) => r.status).sort()).toEqual([200, 429]);
    const limited = res.find((r) => r.status === 429)!;
    expect((await limited.json()).error.retryAfterSeconds).toBeGreaterThan(0);
  });
});
