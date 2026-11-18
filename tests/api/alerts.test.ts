import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/alerts/[id]/route";
import { POST as CLEAR } from "@/app/api/alerts/clear/route";
import { GET } from "@/app/api/alerts/route";
import { GET as UNREAD } from "@/app/api/alerts/unread/route";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;
let samba: string;
let jacket: string;
const mk = (userId: string, itemId: string, read: boolean, at: string, kind: "PRICE_DROP" | "LOW_SIZE" = "LOW_SIZE") =>
  prisma.alert.create({
    data: { userId, itemId, size: "9", kind, read, createdAt: new Date(at), detail: kind === "LOW_SIZE" ? { qty: 1 } : { from: 60, to: 50 } },
  });

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  samba = (await prisma.item.findFirstOrThrow({ where: { userId: a, name: "Adidas Samba OG" } })).id;
  jacket = (await prisma.item.findFirstOrThrow({ where: { userId: a, name: "Denim jacket" } })).id;
  signInAs(a);
});

describe("GET /api/alerts", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await GET()).status).toBe(401);
  });

  it("empty for a user with no alerts", async () => {
    expect((await (await GET()).json()).data).toEqual({ groups: [], unreadCount: 0, readCount: 0 });
  });

  it("groups by item, newest first, with unread counts", async () => {
    await mk(a, samba, false, "2026-10-01T10:00:00Z");
    await mk(a, samba, true, "2026-10-03T10:00:00Z", "PRICE_DROP");
    await mk(a, samba, false, "2026-10-02T10:00:00Z");
    await mk(a, jacket, false, "2026-10-05T10:00:00Z");
    await mk(b, samba, false, "2026-10-06T10:00:00Z");
    const { data } = await (await GET()).json();
    expect(data.unreadCount).toBe(3);
    expect(data.groups.map((g: { itemId: string }) => g.itemId)).toEqual([jacket, samba]);
    const g = data.groups[1];
    expect(g).toMatchObject({ itemName: "Adidas Samba OG", unread: 2 });
    expect(g.alerts.map((x: { createdAt: string }) => x.createdAt)).toEqual([
      "2026-10-03T10:00:00.000Z", "2026-10-02T10:00:00.000Z", "2026-10-01T10:00:00.000Z",
    ]);
    expect(g.alerts[0]).toEqual({
      id: expect.any(String), watchId: null, itemId: samba, itemName: "Adidas Samba OG", size: "9", kind: "price_drop",
      detail: { from: 60, to: 50 }, read: true, createdAt: "2026-10-03T10:00:00.000Z",
    });
  });
});

describe("GET /api/alerts/unread", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await UNREAD()).status).toBe(401);
  });

  it("counts only the user's unread alerts", async () => {
    await mk(a, samba, false, "2026-10-29T10:00:00Z");
    await mk(a, jacket, false, "2026-10-29T11:00:00Z");
    await mk(a, samba, true, "2026-10-29T12:00:00Z");
    const bItem = (await prisma.item.create({ data: { userId: b, name: "B item", category: "shoes", sizes: ["9"], selectedSize: "9", typicalPrice: 10 } })).id;
    await mk(b, bItem, false, "2026-10-29T13:00:00Z");
    expect((await (await UNREAD()).json()).data).toEqual({ unreadCount: 2 });
  });
});

describe("GET /api/alerts limit", () => {
  it("returns at most 200 alerts but counts every unread one", async () => {
    await prisma.alert.createMany({
      data: Array.from({ length: 205 }, (_, i) => ({
        userId: a, itemId: samba, size: "9", kind: "LOW_SIZE" as const, detail: { qty: 1 }, createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, i)),
      })),
    });
    await mk(a, jacket, false, "2026-09-01T10:00:00Z");
    const { data } = await (await GET()).json();
    expect(data.groups.reduce((n: number, g: { alerts: unknown[] }) => n + g.alerts.length, 0)).toBe(200);
    expect(data.groups.find((g: { itemId: string }) => g.itemId === samba).unread).toBe(205);
    expect(data.groups.find((g: { itemId: string }) => g.itemId === jacket)?.unread ?? 1).toBe(1);
    expect(data.unreadCount).toBe(206);
  });
});

describe("PATCH /api/alerts/[id]", () => {
  const patch = (id: string, body: unknown) => PATCH(req(`/api/alerts/${id}`, "PATCH", body), ctx(id));

  it("401 without a session", async () => {
    signInAs(null);
    expect((await patch("x", { read: true })).status).toBe(401);
  });

  it("400 on a bad body", async () => {
    const al = await mk(a, samba, false, "2026-10-01T10:00:00Z");
    expect((await patch(al.id, { read: "yes" })).status).toBe(400);
    expect((await patch(al.id, {})).status).toBe(400);
  });

  it("404 for another user's alert and leaves it", async () => {
    const al = await mk(b, samba, false, "2026-10-01T10:00:00Z");
    expect((await patch(al.id, { read: true })).status).toBe(404);
    expect((await prisma.alert.findUniqueOrThrow({ where: { id: al.id } })).read).toBe(false);
  });

  it("marks read and unread", async () => {
    const al = await mk(a, samba, false, "2026-10-01T10:00:00Z");
    const res = await patch(al.id, { read: true });
    expect(res.status).toBe(200);
    expect((await res.json()).data.read).toBe(true);
    expect((await (await patch(al.id, { read: false })).json()).data.read).toBe(false);
  });
});

describe("POST /api/alerts/clear", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await CLEAR()).status).toBe(401);
  });

  it("deletes only the caller's read alerts", async () => {
    await mk(a, samba, true, "2026-10-01T10:00:00Z");
    await mk(a, jacket, true, "2026-10-02T10:00:00Z");
    await mk(a, samba, false, "2026-10-03T10:00:00Z");
    await mk(b, samba, true, "2026-10-04T10:00:00Z");
    const res = await CLEAR();
    expect((await res.json()).data).toEqual({ deleted: 2 });
    expect(await prisma.alert.count({ where: { userId: a } })).toBe(1);
    expect(await prisma.alert.count({ where: { userId: b } })).toBe(1);
  });
});
