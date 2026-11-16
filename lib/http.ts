import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function fail(status: number, code: string, message: string, extra?: { retryAfterSeconds?: number }, headers?: HeadersInit): Response {
  return Response.json({ error: { code, message, ...extra } }, { status, headers });
}

export function unauthorized(): Response {
  return fail(401, "unauthorized", "Sign in required");
}

export function itemNotFound(): Response {
  return fail(404, "not_found", "Item not found");
}

export async function requireUserId(): Promise<string | Response> {
  const session = await auth();
  return session?.user?.id ?? unauthorized();
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

/** The foreign key a P2003 failed on, from the driver adapter's error detail. */
export function fkName(e: Prisma.PrismaClientKnownRequestError): string {
  const meta = e.meta as { driverAdapterError?: { cause?: { constraint?: { index?: string } } } } | undefined;
  return meta?.driverAdapterError?.cause?.constraint?.index ?? "";
}

/** A foreign key violation on a user column: the session names a user that no longer exists. */
export function isStaleUser(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003" && /_(userId|lastCheckedById)_fkey$/.test(fkName(e))
  );
}

/** Wrap a route handler: anything unhandled becomes a JSON 500. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      unstable_rethrow(e); // Next control-flow errors (prerender bailouts) must pass through
      if (isStaleUser(e)) return unauthorized();
      console.error(e);
      return fail(500, "internal", "Something went wrong");
    }
  };
}
