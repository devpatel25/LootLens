import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/items/route";
import { prisma } from "@/lib/prisma";
import type { WishlistItem } from "@/lib/types";
import { hasDemoListings, loadWishlist, wishlistShowsDemo } from "@/lib/wishlist";
import { seed } from "@/prisma/seed";
import { signInAs } from "./helpers/auth";
import { resetDb } from "./helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  signInAs(a);
});

describe("loadWishlist", () => {
  it("GET /api/items returns the loader's list for the session user", async () => {
    const { data } = await (await GET()).json();
    expect(data.map((i: { name: string }) => i.name).sort()).toEqual(["Adidas Samba OG", "Denim jacket", "Mechanical keyboard"]);
  });

  it("names the cheapest in-stock store for the saved size", async () => {
    const samba = (await loadWishlist(a)).find((i) => i.name === "Adidas Samba OG");
    expect(samba?.cheapest).toMatchObject({ storeName: "Facebook Marketplace", price: 60 });
  });

  it("returns nothing for another user", async () => {
    expect(await loadWishlist(b)).toEqual([]);
  });
});

describe("hasDemoListings", () => {
  it("is true while any listing on the user's items is demo", async () => {
    expect(await hasDemoListings(a)).toBe(true);
  });

  it("is false once every listing is live, and for a user with no items", async () => {
    await prisma.listing.updateMany({ data: { source: "LIVE" } });
    expect(await hasDemoListings(a)).toBe(false);
    expect(await hasDemoListings(b)).toBe(false);
  });
});

describe("wishlistShowsDemo", () => {
  const card = (cheapest: Partial<NonNullable<WishlistItem["cheapest"]>> | null) =>
    ({ cheapest: cheapest && { source: "live", ...cheapest } }) as WishlistItem;

  it("is true when a card shows a demo price", () => {
    expect(wishlistShowsDemo([card({ source: "live" }), card({ source: "demo" })])).toBe(true);
  });
  it("is true when a card has no price to show, since nothing on it is live", () => {
    expect(wishlistShowsDemo([card({ source: "live" }), card(null)])).toBe(true);
  });
  it("is false when every card shows a live price, or there are no cards", () => {
    expect(wishlistShowsDemo([card({ source: "live" })])).toBe(false);
    expect(wishlistShowsDemo([])).toBe(false);
  });
});
