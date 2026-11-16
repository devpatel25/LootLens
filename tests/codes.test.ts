import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/codes/route";
import { loadCodes } from "@/lib/codes";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { req } from "./helpers/api";
import { signInAs } from "./helpers/auth";
import { resetDb } from "./helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

let a: string;

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  signInAs(a);
});

const codesOf = (list: { code: string }[]) => list.map((c) => c.code).sort();

describe("loadCodes", () => {
  it("default: only live codes checked inside the window and not expired", async () => {
    expect(codesOf(await loadCodes({ showDead: false, freshnessHours: 24 }))).toEqual(["BR10", "SAMBA20", "SAVE25", "TGT50", "WELCOME15"]);
  });

  it("showDead: every code, including dead, stale, and expired", async () => {
    expect(await loadCodes({ showDead: true, freshnessHours: 24 })).toHaveLength(8);
  });

  it("filters by store", async () => {
    expect(codesOf(await loadCodes({ showDead: true, storeId: "store-amazon", freshnessHours: 24 }))).toEqual(["DEADDEAL", "SAVE25"]);
  });

  it("follows the freshness window it is given", async () => {
    expect(codesOf(await loadCodes({ showDead: false, freshnessHours: 48 }))).toContain("SAVE10");
  });

  it("GET /api/codes uses the user's saved window", async () => {
    await prisma.userSettings.upsert({ where: { userId: a }, update: { freshnessHours: 48 }, create: { userId: a, freshnessHours: 48 } });
    const { data } = await (await GET(req("/api/codes"))).json();
    expect(codesOf(data)).toContain("SAVE10");
  });

  it("GET /api/codes returns the same list as the loader", async () => {
    const { data } = await (await GET(req("/api/codes"))).json();
    expect(codesOf(data)).toEqual(codesOf(await loadCodes({ showDead: false, freshnessHours: 24 })));
  });
});
