import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as GET_LISTINGS } from "@/app/api/items/[id]/listings/route";
import { GET, PATCH } from "@/app/api/settings/route";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;
const patch = (body: unknown) => PATCH(req("/api/settings", "PATCH", body));

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  signInAs(a);
});

describe("/api/settings", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await GET(req("/api/settings"))).status).toBe(401);
    expect((await patch({})).status).toBe(401);
  });

  it("a stale session reads the defaults, but a write is a 401", async () => {
    signInAs("ghost");
    const res = await GET(req("/api/settings"));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ freshnessHours: 24, firstOrderEligible: false });
    expect((await patch({ freshnessHours: 12 })).status).toBe(401);
  });

  it("GET returns defaults without writing when there is no settings row", async () => {
    signInAs(b);
    expect(await prisma.userSettings.count({ where: { userId: b } })).toBe(0);
    const res = await GET(req("/api/settings"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { freshnessHours: 24, firstOrderEligible: false } });
    expect(await prisma.userSettings.count({ where: { userId: b } })).toBe(0);
  });

  it("PATCH updates one field and keeps the other", async () => {
    expect((await (await patch({ freshnessHours: 72 })).json()).data).toEqual({ freshnessHours: 72, firstOrderEligible: false });
    expect((await (await patch({ firstOrderEligible: true })).json()).data).toEqual({ freshnessHours: 72, firstOrderEligible: true });
    expect((await (await GET(req("/api/settings"))).json()).data).toEqual({ freshnessHours: 72, firstOrderEligible: true });
  });

  it("PATCH creates the row when missing", async () => {
    signInAs(b);
    expect((await patch({ freshnessHours: 6 })).status).toBe(200);
    expect(await prisma.userSettings.findUniqueOrThrow({ where: { userId: b } })).toMatchObject({ freshnessHours: 6 });
  });

  it.each([
    ["freshnessHours 10", { freshnessHours: 10 }],
    ["a string flag", { firstOrderEligible: "yes" }],
    ["bad json", "{nope"],
  ])("400 for %s", async (_n, body) => {
    expect((await patch(body)).status).toBe(400);
  });

  it("A's PATCH leaves B's row unchanged", async () => {
    await prisma.userSettings.create({ data: { userId: b, freshnessHours: 12 } });
    await patch({ freshnessHours: 72, firstOrderEligible: true });
    expect(await prisma.userSettings.findUniqueOrThrow({ where: { userId: b } })).toMatchObject({
      freshnessHours: 12,
      firstOrderEligible: false,
    });
  });

  it("turning first-order on makes WELCOME15 apply on the comparison", async () => {
    const id = (await prisma.item.findFirstOrThrow({ where: { userId: a, name: "Denim jacket" } })).id;
    const aeCode = async () => {
      const { data } = await (await GET_LISTINGS(req(`/api/items/${id}/listings`), ctx(id))).json();
      const l = data.listings.find((x: { storeId: string }) => x.storeId === "store-ae");
      return data.bestDeals.find((x: { listingId: string }) => x.listingId === l.id).code;
    };
    expect(await aeCode()).toBeNull();
    await patch({ firstOrderEligible: true });
    expect(await aeCode()).toMatchObject({ code: "WELCOME15" });
  });
});
