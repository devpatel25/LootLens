import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fail, ok, parse, requireUserId } from "@/lib/http";
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
  it("400 bad_request with the first issue message", async () => {
    const res = parse(schema, { n: "x" }) as Response;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("bad_request");
    expect(body.error.message).toBe(schema.safeParse({ n: "x" }).error!.issues[0].message);
  });
});
