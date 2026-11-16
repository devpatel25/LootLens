import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/stores/route";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

beforeEach(async () => {
  await resetDb();
  const { demoUserId } = await seed(prisma);
  await prisma.user.create({ data: { email: "b@lootlens.test" } });
  signInAs(demoUserId);
});

describe("GET /api/stores", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await GET(req("/api/stores"))).status).toBe(401);
  });

  it("returns 8 stores sorted A to Z with contract types", async () => {
    const res = await GET(req("/api/stores"));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toHaveLength(8);
    const names = data.map((s: { name: string }) => s.name);
    expect(names).toEqual([...names].sort((x, y) => x.localeCompare(y)));
    expect(typeof data[0].rating).toBe("number");
    expect(data[0].trust).toEqual({ lowTrust: false, reasons: [] });
  });

  it("any signed-in user can read, and KickSwap is low trust", async () => {
    const other = await prisma.user.findFirstOrThrow({ where: { email: "b@lootlens.test" } });
    signInAs(other.id);
    const { data } = await (await GET(req("/api/stores"))).json();
    const kick = data.find((s: { id: string }) => s.id === "store-kickswap");
    expect(kick.fictional).toBe(true);
    expect(kick.trust.lowTrust).toBe(true);
    expect(kick.trust.reasons).toEqual(["no_https", "few_photo_reviews", "low_rating"]);
  });
});
