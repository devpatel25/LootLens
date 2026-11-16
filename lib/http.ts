import type { z } from "zod";
import { auth } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function fail(status: number, code: string, message: string, extra?: { retryAfterSeconds?: number }): Response {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

export async function requireUserId(): Promise<string | Response> {
  const session = await auth();
  return session?.user?.id ?? fail(401, "unauthorized", "Sign in required");
}

export function parse<T>(schema: z.ZodType<T>, input: unknown): T | Response {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const { path, message } = r.error.issues[0];
  return fail(400, "bad_request", path.length ? `${path.join(".")}: ${message}` : message);
}

/** A write that matched no row (P2025). */
export function isMissingRow(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

/** A foreign key violation: the session names a user that no longer exists. */
export function isStaleUser(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003";
}
