import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/watches/[id]/route";
import { GET, POST } from "@/app/api/watches/route";
import { Prisma } from "@/lib/generated/prisma/client";
import { MAX_WATCHES_PER_USER } from "@/lib/refresh";
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
      createdAt: expect.any(String),
    });
    expect(data).not.toHaveProperty("userId");
  });

  it("starts the cond flags from the current state", async () => {
    // Cheapest is 60, so a target of 70 is already met; stock 10 is above lowStockAt 3.
    await post({ itemId: samba, size: "9", targetPrice: 70 });
    expect(await prisma.watch.findFirstOrThrow()).toMatchObject({ priceCondMet: true, stockCondMet: false });
  });

  it("404 when the item vanishes before the insert", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("fk", {
      code: "P2003",
      clientVersion: "x",
      meta: { driverAdapterError: { cause: { kind: "ForeignKeyConstraintViolation", constraint: { index: "Watch_itemId_fkey" } } } },
    });
    vi.spyOn(prisma.watch, "create").mockRejectedValueOnce(err);
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
    await prisma.alert.create({ data: { userId: a, itemId: samba, watchId: data.id, kind: "LOW_SIZE", detail: { qty: 1 } } });
    expect((await del(data.id)).status).toBe(200);
    expect(await prisma.watch.count()).toBe(0);
    expect((await prisma.alert.findFirstOrThrow()).watchId).toBeNull();
  });
});
