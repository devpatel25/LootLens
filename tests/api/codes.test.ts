import { beforeEach, describe, expect, it, vi } from "vitest";
import * as codeRoute from "@/app/api/codes/[id]/route";
import * as listRoute from "@/app/api/codes/route";
import { PATCH as patchSettings } from "@/app/api/settings/route";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { GET } = listRoute;
const { PATCH } = codeRoute;
let a: string;
let b: string;
const list = async (qs = "") => {
  const res = await GET(req(`/api/codes${qs}`));
  return { res, data: (await res.clone().json()).data as { code: string; id: string }[] };
};
const names = (d: { code: string }[]) => d.map((c) => c.code).sort();
const mark = (id: string, status: unknown) => PATCH(req(`/api/codes/${id}`, "PATCH", { status }), ctx(id));

beforeEach(async () => {
  await resetDb();
  a = (await seed(prisma)).demoUserId;
  b = (await prisma.user.create({ data: { email: "b@lootlens.test" } })).id;
  signInAs(a);
});

describe("GET /api/codes", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await GET(req("/api/codes"))).status).toBe(401);
  });

  it("a stale session still reads the shared list, and nothing is written", async () => {
    signInAs("ghost");
    expect((await GET(req("/api/codes"))).status).toBe(200);
    expect(await prisma.userSettings.count({ where: { userId: "ghost" } })).toBe(0);
  });

  it("default list: the 5 live, fresh, unexpired codes", async () => {
    const { res, data } = await list();
    expect(res.status).toBe(200);
    expect(names(data)).toEqual(["BR10", "SAMBA20", "SAVE25", "TGT50", "WELCOME15"]);
  });

  it("has the contract shape", async () => {
    const { data } = await list("?storeId=store-adidas");
    expect(data).toEqual([
      {
        id: "code-adidas-20",
        storeId: "store-adidas",
        storeName: "Adidas",
        code: "SAMBA20",
        label: "20% off",
        type: "pct",
        value: 20,
        minSpend: null,
        firstOrderOnly: false,
        expiresAt: null,
        status: "live",
        lastCheckedAt: expect.any(String),
        cashback: { provider: "DemoCash", ratePct: 5 },
      },
    ]);
    const amazon = (await list("?storeId=store-amazon")).data as unknown as { minSpend: number | null }[];
    expect(amazon.some((c) => c.minSpend === 150)).toBe(true);
  });

  it("sorts by lastCheckedAt desc, with codes no one has checked last", async () => {
    await prisma.code.create({
      data: { storeId: "store-target", code: "TARGET10", label: "$10 off orders of $50 or more", type: "FLAT", value: 10, status: "LIVE" },
    });
    const { data } = await list("?showDead=true");
    const rows = data as unknown as { code: string; lastCheckedAt: string | null }[];
    expect(rows[rows.length - 1]).toMatchObject({ code: "TARGET10", lastCheckedAt: null });
    const times = rows.filter((c) => c.lastCheckedAt !== null).map((c) => Date.parse(c.lastCheckedAt!));
    expect(times).toEqual([...times].sort((x, y) => y - x));
  });

  it("SAVE10 appears when the window grows to 48 hours", async () => {
    const res = await patchSettings(req("/api/settings", "PATCH", { freshnessHours: 48 }));
    expect(res.status).toBe(200);
    expect(names((await list()).data)).toContain("SAVE10");
  });

  it("showDead=true returns all 8 codes", async () => {
    const { data } = await list("?showDead=true");
    expect(data).toHaveLength(8);
    expect(names(data)).toEqual(expect.arrayContaining(["DEADDEAL", "SAVE10", "TGT20"]));
  });

  it("400 for showDead=yes", async () => {
    expect((await GET(req("/api/codes?showDead=yes"))).status).toBe(400);
  });

  it("storeId filters; an unknown store gives []", async () => {
    expect(names((await list("?storeId=store-target")).data)).toEqual(["TGT50"]);
    expect((await list("?storeId=nope")).data).toEqual([]);
  });

  it("readable by any signed-in user", async () => {
    signInAs(b);
    expect((await list()).data).toHaveLength(5);
  });
});

describe("PATCH /api/codes/[id]", () => {
  it("401 without a session", async () => {
    signInAs(null);
    expect((await mark("code-adidas-20", "dead")).status).toBe(401);
  });

  it("401 for a user that no longer exists, and the row is unchanged", async () => {
    const before = await prisma.code.findUniqueOrThrow({ where: { id: "code-adidas-20" } });
    signInAs("ghost");
    expect((await mark("code-adidas-20", "dead")).status).toBe(401);
    expect(await prisma.code.findUniqueOrThrow({ where: { id: "code-adidas-20" } })).toEqual(before);
  });

  it("marking SAMBA20 dead hides it and records who checked", async () => {
    const res = await mark("code-adidas-20", "dead");
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toMatchObject({ code: "SAMBA20", status: "dead", storeName: "Adidas" });
    expect(Date.now() - Date.parse(data.lastCheckedAt)).toBeLessThan(10_000);
    const row = await prisma.code.findUniqueOrThrow({ where: { id: "code-adidas-20" } });
    expect(row.lastCheckedById).toBe(a);
    expect(names((await list()).data)).not.toContain("SAMBA20");
  });

  it("marking DEADDEAL alive brings it back", async () => {
    expect(names((await list()).data)).not.toContain("DEADDEAL");
    signInAs(b);
    expect((await mark("code-amazon-dead", "live")).status).toBe(200);
    expect(names((await list()).data)).toContain("DEADDEAL");
    expect((await prisma.code.findUniqueOrThrow({ where: { id: "code-amazon-dead" } })).lastCheckedById).toBe(b);
  });

  it("404 when the write finds no row (P2025)", async () => {
    vi.spyOn(prisma.code, "update").mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("gone", { code: "P2025", clientVersion: "x" }),
    );
    const res = await mark("code-adidas-20", "dead");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
    vi.restoreAllMocks();
  });

  it("404 for an unknown id", async () => {
    expect((await mark("nope", "dead")).status).toBe(404);
  });

  it("400 for a bad status, a missing body and bad json", async () => {
    expect((await mark("code-adidas-20", "x")).status).toBe(400);
    expect((await PATCH(req("/api/codes/code-adidas-20", "PATCH", {}), ctx("code-adidas-20"))).status).toBe(400);
    expect((await PATCH(req("/api/codes/code-adidas-20", "PATCH", "{nope"), ctx("code-adidas-20"))).status).toBe(400);
  });

  it("codes cannot be created or deleted over the API", () => {
    for (const m of [listRoute, codeRoute]) {
      expect(m).not.toHaveProperty("POST");
      expect(m).not.toHaveProperty("DELETE");
    }
  });
});
