import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/items/[id]/listings/route";
import { cheapestListing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;
const idOf = async (name: string) => (await prisma.item.findFirstOrThrow({ where: { userId: a, name } })).id;
const compare = async (id: string) => {
  const res = await GET(req(`/api/items/${id}/listings`), ctx(id));
  expect(res.status).toBe(200);
  return (await res.json()).data;
};

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  signInAs(a);
});

describe("GET /api/items/[id]/listings", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await GET(req("/api/items/x/listings"), ctx("x"))).status).toBe(401);
  });

  it("404 for another user's item and for an unknown id", async () => {
    const id = await idOf("Adidas Samba OG");
    signInAs(b);
    expect((await GET(req(`/api/items/${id}/listings`), ctx(id))).status).toBe(404);
    signInAs(a);
    expect((await GET(req("/api/items/nope/listings"), ctx("nope"))).status).toBe(404);
  });

  it("Samba size 9: the used Marketplace listing at 60 is cheapest", async () => {
    const d = await compare(await idOf("Adidas Samba OG"));
    expect(d.cheapestListingId).toBe(cheapestListing(d.listings, d.stores, "9")?.id);
    const cheapest = d.listings.find((l: { id: string }) => l.id === d.cheapestListingId);
    expect(cheapest).toMatchObject({ storeId: "store-fbm", price: 60, condition: "used", source: "demo" });
    const amazon = d.listings.find((l: { storeId: string }) => l.storeId === "store-amazon");
    expect(amazon.price).toBe(84.99);
    expect(amazon.stockBySize["9"]).toBe(0);
    expect(d.listings.every((l: { source: string }) => l.source === "demo")).toBe(true);
    expect(d.bestDeals).toHaveLength(d.listings.length);
    expect(d.listings.map((l: { price: number }) => l.price)).toEqual([60, 84.99, 92.5, 100, 118]);
    const names = d.stores.map((s: { name: string }) => s.name);
    expect(names).toEqual([...names].sort((x: string, y: string) => x.localeCompare(y)));
    expect(d.item).not.toHaveProperty("userId");
    expect(typeof d.bestDeals[0].total).toBe("number");
  });

  it("Keyboard: at the 79.99 tie new Amazon beats used, and SAVE25 does not apply", async () => {
    const d = await compare(await idOf("Mechanical keyboard"));
    const cheapest = d.listings.find((l: { id: string }) => l.id === d.cheapestListingId);
    expect(cheapest).toMatchObject({ storeId: "store-amazon", condition: "new", price: 79.99 });
    const deal = d.bestDeals.find((x: { listingId: string }) => x.listingId === cheapest.id);
    expect(deal.code).toBeNull();
    expect(deal.cashback).toMatchObject({ ratePct: 3 });
    expect(deal.total).toBeCloseTo(79.99 * 0.97, 6);
  });

  it("Denim: low-trust KickSwap is cheapest, Target is the trusted pick", async () => {
    const d = await compare(await idOf("Denim jacket"));
    const byId = (id: string) => d.listings.find((l: { id: string }) => l.id === id);
    expect(byId(d.cheapestListingId).storeId).toBe("store-kickswap");
    expect(byId(d.cheapestTrustedListingId).storeId).toBe("store-target");
    const target = d.bestDeals.find((x: { listingId: string }) => byId(x.listingId).storeId === "store-target");
    expect(target.code).toMatchObject({ code: "TGT50", discount: 39 });
    expect(target.total).toBe(0);
  });

  it("Denim: WELCOME15 is excluded until first-order is on, then applies", async () => {
    const id = await idOf("Denim jacket");
    const ae = (d: { listings: { id: string; storeId: string }[]; bestDeals: { listingId: string; code: unknown }[] }) => {
      const l = d.listings.find((x) => x.storeId === "store-ae")!;
      return d.bestDeals.find((x) => x.listingId === l.id)!;
    };
    expect(ae(await compare(id)).code).toBeNull();
    await prisma.userSettings.update({ where: { userId: a }, data: { firstOrderEligible: true } });
    expect(ae(await compare(id)).code).toMatchObject({ code: "WELCOME15" });
  });

  it("zero stock in the size gives null cheapest and null bestDeal", async () => {
    const id = await idOf("Denim jacket");
    await prisma.listing.updateMany({ where: { itemId: id }, data: { stockBySize: { S: 1, M: 0, L: 1 } } });
    const d = await compare(id);
    expect(d.cheapestListingId).toBeNull();
    expect(d.cheapestTrustedListingId).toBeNull();
    expect(d.bestDeal).toBeNull();
  });
});
