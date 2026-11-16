import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET as GET_ONE, PATCH } from "@/app/api/items/[id]/route";
import { GET as COMPARE } from "@/app/api/items/[id]/listings/route";
import { GET, POST } from "@/app/api/items/route";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;
const good = { name: "Trail shoes", category: "shoes", sizes: ["8", "9"], selectedSize: "9", typicalPrice: 120 };
const itemId = async (name: string) => (await prisma.item.findFirstOrThrow({ where: { userId: a, name } })).id;

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  signInAs(a);
});

describe("GET /api/items", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await GET()).status).toBe(401);
  });

  it("lists the user's items newest first with the contract shape", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toHaveLength(3);
    const times = data.map((i: { createdAt: string }) => Date.parse(i.createdAt));
    expect(times).toEqual([...times].sort((x, y) => y - x));
    const samba = data.find((i: { name: string }) => i.name === "Adidas Samba OG");
    expect(typeof samba.typicalPrice).toBe("number");
    expect(samba).not.toHaveProperty("userId");
    expect(samba).not.toHaveProperty("lastRefreshedAt");
    expect(samba.cheapest).toEqual({ listingId: expect.any(String), storeName: "Facebook Marketplace", price: 60 });
    expect(new Date(samba.createdAt).toISOString()).toBe(samba.createdAt);
  });

  it("does not list another user's items", async () => {
    signInAs(b);
    expect((await (await GET()).json()).data).toEqual([]);
  });

  it("null cheapest when nothing is in stock for the size", async () => {
    const id = await itemId("Denim jacket");
    await prisma.listing.updateMany({ where: { itemId: id }, data: { stockBySize: { S: 1, M: 0, L: 1 } } });
    const { data } = await (await GET()).json();
    expect(data.find((i: { id: string }) => i.id === id).cheapest).toBeNull();
  });
});

describe("POST /api/items", () => {
  const post = (body: unknown) => POST(req("/api/items", "POST", body));

  it("401 without a session", async () => {
    signInAs(null);
    expect((await post(good)).status).toBe(401);
  });

  it("401 for a user that no longer exists", async () => {
    signInAs("ghost");
    expect((await post(good)).status).toBe(401);
    expect(await prisma.item.count({ where: { userId: "ghost" } })).toBe(0);
  });

  it.each([
    ["missing name", { ...good, name: undefined }],
    ["selectedSize not in sizes", { ...good, selectedSize: "12" }],
    ["zero price", { ...good, typicalPrice: 0 }],
    ["duplicate sizes", { ...good, sizes: ["8", "8"], selectedSize: "8" }],
    ["javascript url", { ...good, sourceUrl: "javascript:alert(1)" }],
    ["bad json", "{not json"],
    ["price too large for the column", { ...good, typicalPrice: 1e9 }],
    ["more than two decimals", { ...good, typicalPrice: 12.345 }],
    ["overlong selectedSize", { ...good, sizes: ["x".repeat(21)], selectedSize: "x".repeat(21) }],
  ])("400 for %s", async (_n, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad_request");
  });

  it("creates the item with demo listings and returns 201 Item", async () => {
    const res = await post({ ...good, imageUrl: "https://example.com/a.png" });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({ name: "Trail shoes", typicalPrice: 120, imageUrl: "https://example.com/a.png", sourceUrl: null });
    expect(data).not.toHaveProperty("userId");
    const listings = await prisma.listing.findMany({ where: { itemId: data.id } });
    expect(listings.length).toBeGreaterThanOrEqual(3);
    expect(listings.every((l) => l.source === "DEMO")).toBe(true);
  });

  it("trims selectedSize before comparing it to sizes", async () => {
    const res = await post({ ...good, sizes: [" M "], selectedSize: " M " });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({ sizes: ["M"], selectedSize: "M" });
  });

  it("accepts the largest price the column holds", async () => {
    expect((await post({ ...good, typicalPrice: 99999.99 })).status).toBe(201);
  });

  it("ignores a userId in the body", async () => {
    const { data } = await (await post({ ...good, userId: b })).json();
    const row = await prisma.item.findUniqueOrThrow({ where: { id: data.id } });
    expect(row.userId).toBe(a);
  });

  it("the new item shows a non-null cheapest in the list", async () => {
    const { data } = await (await post(good)).json();
    const list = (await (await GET()).json()).data;
    expect(list.find((i: { id: string }) => i.id === data.id).cheapest).not.toBeNull();
  });
});

describe("/api/items/[id]", () => {
  let id: string;
  beforeEach(async () => {
    id = await itemId("Denim jacket");
  });
  const patch = (body: unknown, who = id) => PATCH(req(`/api/items/${who}`, "PATCH", body), ctx(who));

  it("401 without a session on every method", async () => {
    signInAs(null);
    expect((await GET_ONE(req(`/api/items/${id}`), ctx(id))).status).toBe(401);
    expect((await patch({ name: "x" })).status).toBe(401);
    expect((await DELETE(req(`/api/items/${id}`, "DELETE"), ctx(id))).status).toBe(401);
  });

  it("GET returns the Item", async () => {
    const res = await GET_ONE(req(`/api/items/${id}`), ctx(id));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ id, name: "Denim jacket", typicalPrice: 65, sizes: ["S", "M", "L"] });
  });

  it("404 for an unknown id", async () => {
    expect((await GET_ONE(req("/api/items/nope"), ctx("nope"))).status).toBe(404);
    expect((await patch({ name: "x" }, "nope")).status).toBe(404);
    expect((await DELETE(req("/api/items/nope", "DELETE"), ctx("nope"))).status).toBe(404);
  });

  it("400 for an overlong id", async () => {
    const long = "x".repeat(65);
    expect((await GET_ONE(req(`/api/items/${long}`), ctx(long))).status).toBe(400);
  });

  it("PATCH updates fields", async () => {
    const res = await patch({ name: "  Jean jacket ", typicalPrice: 70, sizes: ["M", "L"], selectedSize: "L" });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ name: "Jean jacket", typicalPrice: 70, sizes: ["M", "L"], selectedSize: "L" });
  });

  it("PATCH 400 when sizes drops the current size", async () => {
    expect((await patch({ sizes: ["S", "L"] })).status).toBe(400);
    expect((await prisma.item.findUniqueOrThrow({ where: { id } })).sizes).toEqual(["S", "M", "L"]);
  });

  it("PATCH 400 when selectedSize alone is outside sizes", async () => {
    expect((await patch({ selectedSize: "XL" })).status).toBe(400);
  });

  it("PATCH 400 for bad json", async () => {
    expect((await patch("{nope")).status).toBe(400);
  });

  it("PATCH 404 when the row is deleted between the read and the write", async () => {
    const orig = prisma.item.findFirst.bind(prisma.item);
    vi.spyOn(prisma.item, "findFirst").mockImplementationOnce(((...args: Parameters<typeof orig>) =>
      orig(...args).then(async (r) => {
        await prisma.item.delete({ where: { id } });
        return r;
      })) as never);
    const res = await patch({ name: "late" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
    vi.restoreAllMocks();
  });

  it("PATCH adding a size keeps listing ids, prices and history, and stocks the new size", async () => {
    const before = await prisma.listing.findMany({ where: { itemId: id }, orderBy: { id: "asc" } });
    const hist = await prisma.priceHistory.count({ where: { listing: { itemId: id } } });
    expect((await patch({ sizes: ["S", "M", "L", "XL"], selectedSize: "XL" })).status).toBe(200);
    const after = await prisma.listing.findMany({ where: { itemId: id }, orderBy: { id: "asc" } });
    expect(after.map((l) => [l.id, l.price.toString()])).toEqual(before.map((l) => [l.id, l.price.toString()]));
    expect(await prisma.priceHistory.count({ where: { listing: { itemId: id } } })).toBe(hist);
    expect(after.every((l) => Object.keys(l.stockBySize as object).sort().join() === "L,M,S,XL")).toBe(true);
    expect(after.some((l) => (l.stockBySize as Record<string, number>).XL > 0)).toBe(true);
    const list = (await (await GET()).json()).data;
    expect(list.find((i: { id: string }) => i.id === id).cheapest).not.toBeNull();
  });

  it("PATCH removing a size drops its stock key", async () => {
    await patch({ sizes: ["M", "L"], selectedSize: "M" });
    const rows = await prisma.listing.findMany({ where: { itemId: id } });
    expect(rows.every((l) => Object.keys(l.stockBySize as object).sort().join() === "L,M")).toBe(true);
  });

  it("PATCH that only reorders sizes changes nothing", async () => {
    const before = await prisma.listing.findMany({ where: { itemId: id }, orderBy: { id: "asc" } });
    expect((await patch({ sizes: ["M", "S", "L"] })).status).toBe(200);
    expect(await prisma.listing.findMany({ where: { itemId: id }, orderBy: { id: "asc" } })).toEqual(before);
  });

  it("two concurrent PATCHes, a size change and a rename, both stick", async () => {
    const [r1, r2] = await Promise.all([patch({ sizes: ["M", "XL"], selectedSize: "XL" }), patch({ name: "Renamed jacket" })]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    const row = await prisma.item.findUniqueOrThrow({ where: { id }, include: { listings: true } });
    expect(row.name).toBe("Renamed jacket");
    expect(row.sizes).toEqual(["M", "XL"]);
    expect(row.selectedSize).toBe("XL");
    expect(row.listings.every((l) => Object.keys(l.stockBySize as object).sort().join() === "M,XL")).toBe(true);
  });

  it("PATCH with new sizes deletes watches on removed sizes only", async () => {
    const mk = (size: string) =>
      prisma.watch.create({ data: { userId: a, itemId: id, size, baselinePrice: 40 } });
    await mk("S");
    await mk("M");
    await patch({ sizes: ["M", "XL"], selectedSize: "M" });
    expect((await prisma.watch.findMany({ where: { itemId: id } })).map((w) => w.size)).toEqual(["M"]);
  });

  it("PATCH without a sizes change keeps the listings", async () => {
    const before = (await prisma.listing.findMany({ where: { itemId: id } })).map((l) => l.id).sort();
    await patch({ name: "Renamed" });
    expect((await prisma.listing.findMany({ where: { itemId: id } })).map((l) => l.id).sort()).toEqual(before);
  });

  it("wishlist cheapest matches the comparison on a full tie", async () => {
    const mk = (n: string) => ({ id: `twin-${n}`, name: "Twin", domain: "t.example", sellerName: "T", isHttps: true, photoReviewCount: 99, rating: 4.5 });
    await prisma.store.createMany({ data: [mk("1"), mk("2")] });
    const item = await prisma.item.create({ data: { userId: a, name: "Tie", category: "c", sizes: ["One"], selectedSize: "One", typicalPrice: 10 } });
    const l = (lid: string, storeId: string) => ({ id: lid, itemId: item.id, storeId, url: "https://t.example", price: 10, condition: "NEW" as const, stockBySize: { One: 1 }, source: "DEMO" as const });
    await prisma.listing.create({ data: l("l-b", "twin-1") });
    await prisma.listing.create({ data: l("l-a", "twin-2") });
    const wish = (await (await GET()).json()).data.find((i: { id: string }) => i.id === item.id);
    const cmp = (await (await COMPARE(req(`/api/items/${item.id}/listings`), ctx(item.id))).json()).data;
    expect(wish.cheapest.listingId).toBe(cmp.cheapestListingId);
  });

  it("user B gets 404 and A's item is unchanged", async () => {
    signInAs(b);
    expect((await GET_ONE(req(`/api/items/${id}`), ctx(id))).status).toBe(404);
    expect((await patch({ name: "hacked" })).status).toBe(404);
    expect((await DELETE(req(`/api/items/${id}`, "DELETE"), ctx(id))).status).toBe(404);
    const row = await prisma.item.findUniqueOrThrow({ where: { id } });
    expect(row.name).toBe("Denim jacket");
    expect(await prisma.listing.count({ where: { itemId: id } })).toBe(4);
  });

  it("DELETE returns { id } and removes the listings", async () => {
    const res = await DELETE(req(`/api/items/${id}`, "DELETE"), ctx(id));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ id });
    expect(await prisma.item.count({ where: { id } })).toBe(0);
    expect(await prisma.listing.count({ where: { itemId: id } })).toBe(0);
  });
});
