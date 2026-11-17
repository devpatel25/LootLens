import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { notFound } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import { fail, isStaleUser, ok, parse, requireUserId, route } from "@/lib/http";
import { signInAs } from "./helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("ok", () => {
  it("wraps data and defaults to 200", async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { a: 1 } });
  });
  it("uses the given status", () => {
    expect(ok({}, 201).status).toBe(201);
  });
});

describe("fail", () => {
  it("returns the error shape", async () => {
    const res = fail(404, "not_found", "Nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "Nope" } });
  });
  it("includes retryAfterSeconds when given", async () => {
    const res = fail(429, "rate_limited", "Slow down", { retryAfterSeconds: 30 });
    expect(await res.json()).toEqual({ error: { code: "rate_limited", message: "Slow down", retryAfterSeconds: 30 } });
  });
});

describe("requireUserId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 with no session", async () => {
    signInAs(null);
    const res = (await requireUserId()) as Response;
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: "unauthorized", message: expect.any(String) } });
  });
  it("401 when the session has no user id", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: {} });
    expect(((await requireUserId()) as Response).status).toBe(401);
  });
  it("returns the id", async () => {
    signInAs("u1");
    expect(await requireUserId()).toBe("u1");
  });
});

describe("parse", () => {
  const schema = z.object({ n: z.number() });
  it("returns the value on success", () => {
    expect(parse(schema, { n: 1 })).toEqual({ n: 1 });
  });
  it("omits the prefix when the issue has no path", async () => {
    const res = parse(z.number(), "x") as Response;
    expect((await res.json()).error.message).toBe(z.number().safeParse("x").error!.issues[0].message);
  });
  it("400 bad_request with the first issue message", async () => {
    const res = parse(schema, { n: "x" }) as Response;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("bad_request");
    expect(body.error.message).toBe(`n: ${schema.safeParse({ n: "x" }).error!.issues[0].message}`);
  });
});

describe("isStaleUser", () => {
  const fk = (index: string) =>
    new Prisma.PrismaClientKnownRequestError("fk", {
      code: "P2003",
      clientVersion: "x",
      meta: { driverAdapterError: { cause: { kind: "ForeignKeyConstraintViolation", constraint: { index } } } },
    });
  it("true for a foreign key violation on a user column", () => {
    expect(isStaleUser(fk("Item_userId_fkey"))).toBe(true);
    expect(isStaleUser(fk("Code_lastCheckedById_fkey"))).toBe(true);
    expect(isStaleUser(fk("UserSettings_userId_fkey"))).toBe(true);
  });
  it("false for a foreign key violation on another column", () => {
    expect(isStaleUser(fk("Code_storeId_fkey"))).toBe(false);
  });
  it("false for a P2003 with no constraint detail", () => {
    expect(isStaleUser(new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "x" }))).toBe(false);
  });
  it("false for other Prisma errors and non-errors", () => {
    expect(isStaleUser(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }))).toBe(false);
    expect(isStaleUser(new Error("boom"))).toBe(false);
    expect(isStaleUser(undefined)).toBe(false);
  });
});

describe("route", () => {
  it("lets a Next control-flow error through instead of returning a 500", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(route(async () => notFound())()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK") });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("turns other errors into a JSON 500", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await route(async () => {
      throw new Error("boom");
    })();
    expect(res.status).toBe(500);
    log.mockRestore();
  });
});
