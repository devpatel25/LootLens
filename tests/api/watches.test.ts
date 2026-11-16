import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_LOW_STOCK } from "@/lib/alerts";
import { DELETE } from "@/app/api/watches/[id]/route";
import { GET, POST } from "@/app/api/watches/route";
import { Prisma } from "@/lib/generated/prisma/client";
import { MAX_WATCHES_PER_USER } from "@/lib/alerts";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;
let samba: string;
const post = (body: unknown) => POST(req("/api/watches", "POST", body));

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  samba = (await prisma.item.findFirstOrThrow({ where: { userId: a, name: "Adidas Samba OG" } })).id;
  signInAs(a);
});

describe("POST /api/watches", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await post({ itemId: samba, size: "9" })).status).toBe(401);
  });

  it.each([
    ["missing itemId", { size: "9" }],
    ["zero target", { itemId: "x", size: "9", targetPrice: 0 }],
    ["negative target", { itemId: "x", size: "9", targetPrice: -5 }],
    ["lowStockAt too big", { itemId: "x", size: "9", lowStockAt: 51 }],
    ["lowStockAt fractional", { itemId: "x", size: "9", lowStockAt: 1.5 }],
    ["bad json", "{nope"],
  ])("400 on %s", async (_n, body) => {
    expect((await post(body)).status).toBe(400);
  });

  it("400 size not in item.sizes", async () => {
    expect((await post({ itemId: samba, size: "12" })).status).toBe(400);
  });

  it("404 for another user's item", async () => {
    signInAs(b);
    expect((await post({ itemId: samba, size: "9" })).status).toBe(404);
    expect(await prisma.watch.count()).toBe(0);
  });

  it("201 with the contract shape and the current cheapest price as baseline", async () => {
    const res = await post({ itemId: samba, size: "9", targetPrice: 55 });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toEqual({
      id: expect.any(String), itemId: samba, size: "9", targetPrice: 55, lowStockAt: 3, baselinePrice: 60, active: true,
      createdAt: expect.any(String), alreadyMet: false,
    });
    expect(data).not.toHaveProperty("userId");
  });

  describe("alreadyMet", () => {
    // Cheapest in-stock size 9 is 60.
    it.each([
      ["target above the current price", { targetPrice: 70 }, true],
      ["target equal to the current price", { targetPrice: 60 }, true],
      ["target below the current price", { targetPrice: 55 }, false],
      ["any drop (no target)", {}, false],
      ["any drop (null target)", { targetPrice: null }, false],
    ])("%s", async (_n, extra, expected) => {
      const res = await post({ itemId: samba, size: "9", ...extra });
      expect(res.status).toBe(201);
      expect((await res.json()).data.alreadyMet).toBe(expected);
    });

    it("false when nothing is in stock for the size (the watch is refused)", async () => {
      await prisma.listing.updateMany({ where: { itemId: samba }, data: { stockBySize: { "8": 0, "9": 0, "10": 0 } } });
      const res = await post({ itemId: samba, size: "9", targetPrice: 70 });
      expect(res.status).toBe(400);
      expect((await res.json()).data).toBeUndefined();
    });
  });

  it("starts the cond flags from the current state", async () => {
    // Cheapest is 60 and 10 are left in size 9 across stores: a target of 55 is not met yet, lowStockAt 10 already is.
    await post({ itemId: samba, size: "9", targetPrice: 55, lowStockAt: 10 });
    expect(await prisma.watch.findFirstOrThrow()).toMatchObject({ priceCondMet: false, stockCondMet: true });
  });

  it.each([60, 70])("400 target_not_below for a target of %s when the cheapest price is 60", async (targetPrice) => {
    // A target at or above today's price would be met at creation and stay silent until the price rose again.
    const res = await post({ itemId: samba, size: "9", targetPrice });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("target_not_below");
    expect(await prisma.watch.count()).toBe(0);
  });

  it("400 for a low-stock threshold above MAX_LOW_STOCK", async () => {
    expect((await post({ itemId: samba, size: "9", lowStockAt: MAX_LOW_STOCK + 1 })).status).toBe(400);
  });

  it("404 when the item vanishes before the insert", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("fk", {
      code: "P2003",
      clientVersion: "x",
      meta: { driverAdapterError: { cause: { kind: "ForeignKeyConstraintViolation", constraint: { index: "Watch_itemId_fkey" } } } },
    });
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(err);
    const res = await post({ itemId: samba, size: "9" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("targetPrice null means any drop", async () => {
    const { data } = await (await post({ itemId: samba, size: "9", targetPrice: null })).json();
    expect(data.targetPrice).toBeNull();
  });

  it("400 no_listing when nothing is in stock for the size", async () => {
    await prisma.listing.updateMany({ where: { itemId: samba }, data: { stockBySize: { "8": 1, "9": 0, "10": 1 } } });
    const res = await post({ itemId: samba, size: "9" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("no_listing");
  });

  it("409 watch_exists for a duplicate item and size, also when raced", async () => {
    expect((await post({ itemId: samba, size: "9" })).status).toBe(201);
    const dup = await post({ itemId: samba, size: "9" });
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe("watch_exists");
    await prisma.watch.deleteMany();
    const res = await Promise.all([post({ itemId: samba, size: "9" }), post({ itemId: samba, size: "9" })]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it("409 watch_limit over the cap", async () => {
    await prisma.watch.createMany({
      data: Array.from({ length: MAX_WATCHES_PER_USER }, (_, i) => ({ userId: a, itemId: samba, size: `x${i}`, baselinePrice: 1 })),
    });
    const res = await post({ itemId: samba, size: "9" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("watch_limit");
  });
});

describe("POST /api/watches at the cap", () => {
  const fill = (n: number, skip = "") =>
    prisma.watch.createMany({
      data: Array.from({ length: n }, (_, i) => ({ userId: a, itemId: samba, size: `x${i}${skip}`, baselinePrice: 1 })),
    });

  it("a duplicate answers watch_exists even when the user is at the cap", async () => {
    await post({ itemId: samba, size: "9" });
    await fill(MAX_WATCHES_PER_USER - 1);
    const res = await post({ itemId: samba, size: "9" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("watch_exists");
  });

  it("two concurrent creates at one below the cap make only one watch", async () => {
    await fill(MAX_WATCHES_PER_USER - 1);
    const res = await Promise.all([post({ itemId: samba, size: "8" }), post({ itemId: samba, size: "10" })]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.watch.count({ where: { userId: a } })).toBe(MAX_WATCHES_PER_USER);
  });

  it("does not deadlock with a refresh that holds the item and inserts an alert", async () => {
    // The refresh shape: lock the item, then insert an alert (its user FK takes a key-share lock on the user).
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let locked!: () => void;
    const lockedItem = new Promise<void>((r) => (locked = r));
    const refresh = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ${samba} FOR UPDATE`;
      locked();
      await held;
      await tx.alert.create({ data: { userId: a, itemId: samba, size: "9", kind: "PRICE_DROP", detail: {} } });
    });
    await lockedItem;
    const creating = post({ itemId: samba, size: "9" }); // takes the user lock, then waits for the item lock
    await new Promise((r) => setTimeout(r, 300));
    release();
    const [res] = await Promise.all([creating, refresh]);
    expect(res.status).toBe(201);
    expect(await prisma.alert.count({ where: { userId: a } })).toBe(1);
  });
});

describe("GET /api/watches", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await GET()).status).toBe(401);
  });

  it("lists only the caller's watches", async () => {
    await post({ itemId: samba, size: "9" });
    expect((await (await GET()).json()).data).toHaveLength(1);
    signInAs(b);
    expect((await (await GET()).json()).data).toEqual([]);
  });
});

describe("DELETE /api/watches/[id]", () => {
  const del = (id: string) => DELETE(req(`/api/watches/${id}`, "DELETE"), ctx(id));

  it("401 without a session", async () => {
    signInAs(null);
    expect((await del("x")).status).toBe(401);
  });

  it("404 for another user's watch and leaves it", async () => {
    const { data } = await (await post({ itemId: samba, size: "9" })).json();
    signInAs(b);
    expect((await del(data.id)).status).toBe(404);
    expect(await prisma.watch.count()).toBe(1);
  });

  it("deletes the caller's watch and keeps its alerts with watchId null", async () => {
    const { data } = await (await post({ itemId: samba, size: "9" })).json();
    await prisma.alert.create({ data: { userId: a, itemId: samba, watchId: data.id, size: "9", kind: "LOW_SIZE", detail: { qty: 1 } } });
    expect((await del(data.id)).status).toBe(200);
    expect(await prisma.watch.count()).toBe(0);
    const kept = await prisma.alert.findFirstOrThrow();
    expect(kept.watchId).toBeNull();
    expect(kept.size).toBe("9");
  });
});
