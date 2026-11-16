import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as codeRoute from "@/app/api/codes/[id]/route";
import * as codesRoute from "@/app/api/codes/route";
import * as itemRoute from "@/app/api/items/[id]/route";
import * as listingsRoute from "@/app/api/items/[id]/listings/route";
import * as itemsRoute from "@/app/api/items/route";
import * as settingsRoute from "@/app/api/settings/route";
import * as storesRoute from "@/app/api/stores/route";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { ctx, req } from "../helpers/api";
import { signInAs } from "../helpers/auth";
import { resetDb } from "../helpers/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const good = { name: "X", category: "c", sizes: ["a"], selectedSize: "a", typicalPrice: 5 };
type Model = Record<string, (...a: never[]) => unknown>;
const cases: [string, () => Promise<Response>, Model, string][] = [
  ["GET /api/items", () => itemsRoute.GET(), prisma.item as unknown as Model, "findMany"],
  ["POST /api/items", () => itemsRoute.POST(req("/api/items", "POST", good)), prisma.store as unknown as Model, "findMany"],
  ["GET /api/items/[id]", () => itemRoute.GET(req("/api/items/x"), ctx("x")), prisma.item as unknown as Model, "findFirst"],
  ["DELETE /api/items/[id]", () => itemRoute.DELETE(req("/api/items/x", "DELETE"), ctx("x")), prisma.item as unknown as Model, "deleteMany"],
  ["GET /api/items/[id]/listings", () => listingsRoute.GET(req("/api/items/x/listings"), ctx("x")), prisma.item as unknown as Model, "findFirst"],
  ["GET /api/stores", () => storesRoute.GET(), prisma.store as unknown as Model, "findMany"],
  ["GET /api/codes", () => codesRoute.GET(req("/api/codes")), prisma.code as unknown as Model, "findMany"],
  ["PATCH /api/codes/[id]", () => codeRoute.PATCH(req("/api/codes/x", "PATCH", { status: "dead" }), ctx("x")), prisma.code as unknown as Model, "update"],
  ["GET /api/settings", () => settingsRoute.GET(), prisma.userSettings as unknown as Model, "findUnique"],
  ["PATCH /api/settings", () => settingsRoute.PATCH(req("/api/settings", "PATCH", {})), prisma.userSettings as unknown as Model, "upsert"],
];

beforeEach(async () => {
  await resetDb();
  signInAs((await seed(prisma)).demoUserId);
});
afterEach(() => vi.restoreAllMocks());

describe("unexpected errors", () => {
  it.each(cases)("%s returns a JSON 500 and logs", async (_n, call, model, method) => {
    vi.spyOn(model, method).mockRejectedValue(new Error("db down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: "Something went wrong" } });
    expect(log).toHaveBeenCalled();
  });
});
