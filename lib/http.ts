import type { z } from "zod";

export function ok<T>(_data: T, _status = 200): Response {
  return new Response(null);
}

export function fail(_status: number, _code: string, _message: string, _extra?: { retryAfterSeconds?: number }): Response {
  return new Response(null);
}

export async function requireUserId(): Promise<string | Response> {
  return "";
}

export function parse<T>(_schema: z.ZodType<T>, _input: unknown): T | Response {
  return new Response(null);
}
