import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as RESET } from "@/app/api/demo/reset/route";
import { POST as SIMULATE } from "@/app/api/demo/simulate/route";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;
let kb: string;
const simulate = (body: unknown = {}) => SIMULATE(req("/api/demo/simulate", "POST", body));
const reset = () => RESET(req("/api/demo/reset", "POST"));
const alerts = () => prisma.alert.count({ where: { userId: a } });
// Cheapest keyboard is 79.99, so a target of 79 is crossed by the 10% demo cut.
const watchKb = () =>
  prisma.watch.create({ data: { userId: a, itemId: kb, size: "One size", targetPrice: 79, lowStockAt: 0, baselinePrice: 79.99 } });

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  kb = (await prisma.item.findFirstOrThrow({ where: { userId: a, name: "Mechanical keyboard" } })).id;
  signInAs(a);
  vi.stubEnv("DEMO_MODE", "true");
});

describe.each([
  ["simulate", () => simulate()],
  ["reset", () => reset()],
])("%s gates", (_n, run) => {
  it("401 signed out", async () => {
    signInAs(null);
    expect((await run()).status).toBe(401);
  });

  it("404 when DEMO_MODE is unset", async () => {
    vi.stubEnv("DEMO_MODE", undefined);
    const res = await run();
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("500 demo_disabled on a production database target", async () => {
    vi.stubEnv("DB_TARGET", "production");
    const res = await run();
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("demo_disabled");
  });
});

describe("POST /api/demo/simulate", () => {
  it("raises a price-drop alert on a crossing and not again for the same state", async () => {
    await watchKb();
    const res = await simulate();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ items: 3, alertsCreated: 1 });
    expect((await prisma.alert.findFirstOrThrow({ where: { userId: a } })).kind).toBe("PRICE_DROP");
    expect((await (await simulate({})).json()).data.alertsCreated).toBe(0);
    expect(await alerts()).toBe(1);
  });

  it("alerts again after a recovery and a new crossing", async () => {
    await watchKb();
    await simulate();
    await prisma.listing.updateMany({ where: { itemId: kb }, data: { price: 100 } });
    await simulate(); // 90, above the target: flag resets
    await prisma.listing.updateMany({ where: { itemId: kb }, data: { price: 85 } });
    await simulate(); // 76.50: crosses again
    expect(await alerts()).toBe(2);
  });

  it("runs one item when itemId is given", async () => {
    const res = await simulate({ itemId: kb });
    expect((await res.json()).data.items).toBe(1);
  });

  it("404 on another user's item", async () => {
    signInAs(b);
    expect((await simulate({ itemId: kb })).status).toBe(404);
    expect((await prisma.listing.findFirstOrThrow({ where: { itemId: kb, storeId: "store-amazon" } })).price.toString()).toBe("79.99");
  });

  it("400 on a bad body", async () => {
    expect((await simulate({ itemId: 5 })).status).toBe(400);
  });
});

describe("POST /api/demo/reset", () => {
  it("restores the demo data and keeps other users' rows", async () => {
    await prisma.item.deleteMany({ where: { userId: a } });
    await prisma.item.create({ data: { userId: b, name: "B item", category: "tech", sizes: ["x"], selectedSize: "x", typicalPrice: 10 } });
    const res = await reset();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ demoUserId: a });
    expect(await prisma.item.count({ where: { userId: a } })).toBe(3);
    expect(await prisma.item.count({ where: { userId: b } })).toBe(1);
  });
});
