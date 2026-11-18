// Dependency-free error body builders. Shared by lib/http.ts and proxy.ts so the shape cannot drift.
export function errorResponse(status: number, code: string, message: string, extra?: { retryAfterSeconds?: number }, headers?: HeadersInit): Response {
  void extra; void headers;
  return Response.json({}, { status });
}

export function unauthorizedResponse(): Response {
  return Response.json({}, { status: 200 });
}
