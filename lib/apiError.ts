// Dependency-free error body builders (no Prisma, no Auth.js). Shared by lib/http.ts and proxy.ts so the shape cannot drift.
export function errorResponse(status: number, code: string, message: string, extra?: { retryAfterSeconds?: number }, headers?: HeadersInit): Response {
  return Response.json({ error: { code, message, ...extra } }, { status, headers });
}

export function unauthorizedResponse(): Response {
  return errorResponse(401, "unauthorized", "Sign in required");
}
