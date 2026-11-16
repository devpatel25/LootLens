import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/refresh/route";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
const call = (authorization?: string) =>
  GET(new Request("http://localhost/api/cron/refresh", { headers: authorization === undefined ? {} : { authorization } }));
const keyboard = () => prisma.item.findFirstOrThrow({ where: { userId: a, name: "Mechanical keyboard" } });

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  vi.stubEnv("CRON_SECRET", "s3cret-value");
});

describe("GET /api/cron/refresh", () => {
  it("401 without a header", async () => {
    expect((await call()).status).toBe(401);
  });

  it("401 with a wrong token, a wrong length token or a wrong scheme", async () => {
    expect((await call("Bearer nope")).status).toBe(401);
    expect((await call("Bearer s3cret-valuf")).status).toBe(401);
    expect((await call("s3cret-value")).status).toBe(401);
  });

  it.each([undefined, ""])("401 when CRON_SECRET is %j, even with an empty token", async (v) => {
    vi.stubEnv("CRON_SECRET", v);
    expect((await call("Bearer ")).status).toBe(401);
    expect((await call("Bearer")).status).toBe(401);
  });

  it("refreshes every item, raises alerts and kills expired live codes", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const kb = await keyboard();
    await prisma.watch.create({ data: { userId: a, itemId: kb.id, size: "One size", targetPrice: 79, lowStockAt: 0, baselinePrice: 79.99 } });
    const res = await call("Bearer s3cret-value");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ items: 3, alertsCreated: 1, codesExpired: 1 });
    expect((await prisma.code.findUniqueOrThrow({ where: { id: "code-target-expired" } })).status).toBe("DEAD");
    expect((await prisma.code.findUniqueOrThrow({ where: { id: "code-adidas-20" } })).status).toBe("LIVE");
  });

  it("leaves prices alone outside demo mode", async () => {
    vi.stubEnv("DEMO_MODE", undefined);
    const before = await prisma.listing.findMany({ orderBy: { id: "asc" } });
    const res = await call("Bearer s3cret-value");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ items: 3, alertsCreated: 0 });
    const after = await prisma.listing.findMany({ orderBy: { id: "asc" } });
    expect(after.map((l) => [l.price.toString(), l.stockBySize])).toEqual(before.map((l) => [l.price.toString(), l.stockBySize]));
  });
});
