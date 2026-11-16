import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as ALERTS } from "@/app/api/alerts/route";
import { GET as WATCHES } from "@/app/api/watches/route";
import { loadAlerts, loadWatchFor, loadWatches } from "@/lib/alertsData";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { signInAs } from "./helpers/auth";
import { resetDb } from "./helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;
let b: string;
let itemId: string;

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  signInAs(a);
  const item = await prisma.item.findFirstOrThrow({ where: { userId: a, name: "Mechanical keyboard" } });
  itemId = item.id;
  const watch = await prisma.watch.create({
    data: { userId: a, itemId, size: "One size", targetPrice: null, lowStockAt: 3, baselinePrice: 79.99, priceCondMet: false, stockCondMet: false },
  });
  await prisma.alert.create({ data: { userId: a, itemId, watchId: watch.id, kind: "PRICE_DROP", detail: { from: 79.99, to: 71.99 } } });
});

describe("loadAlerts", () => {
  it("matches GET /api/alerts", async () => {
    const { data } = await (await ALERTS()).json();
    expect(JSON.parse(JSON.stringify(await loadAlerts(a)))).toEqual(data);
    expect(data.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it("is scoped to the user", async () => {
    expect(await loadAlerts(b)).toEqual({ groups: [], unreadCount: 0, readCount: 0 });
  });
});

describe("loadWatches", () => {
  it("matches GET /api/watches and adds the item name", async () => {
    const { data } = await (await WATCHES()).json();
    const mine = await loadWatches(a);
    const withoutName = mine.map((w) => {
      const copy: Record<string, unknown> = { ...w };
      delete copy.itemName;
      return JSON.parse(JSON.stringify(copy));
    });
    expect(withoutName).toEqual(data);
    expect(mine.find((w) => w.itemId === itemId)?.itemName).toBe("Mechanical keyboard");
    expect(await loadWatches(b)).toEqual([]);
  });

  it("loadWatchFor finds the watch for an item and size, and nothing for another user", async () => {
    expect((await loadWatchFor(a, itemId, "One size"))?.size).toBe("One size");
    expect(await loadWatchFor(a, itemId, "XL")).toBeNull();
    expect(await loadWatchFor(b, itemId, "One size")).toBeNull();
  });
});
