export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ErrorBody = { error?: { code?: string; message?: string; retryAfterSeconds?: number } };

/** Calls a LootLens API route from the browser. Returns `data` or throws ApiClientError. */
export async function apiFetch<T>(url: string, init: { method?: string; json?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: init.json === undefined ? undefined : { "content-type": "application/json" },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const e = (body as ErrorBody | undefined)?.error;
    throw new ApiClientError(e?.message ?? `Request failed (${res.status})`, res.status, e?.code ?? "unknown", e?.retryAfterSeconds);
  }
  return (body as { data: T }).data;
}

/** Plain message to show the shopper for any thrown error. */
export function friendlyMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.status === 401) return "Your session ended. Sign in again.";
    if (err.status === 429) {
      return err.retryAfterSeconds
        ? `Too many requests. Try again in ${err.retryAfterSeconds} seconds.`
        : "Too many requests. Try again in a moment.";
    }
    if (err.status >= 400 && err.status < 500 && err.code !== "unknown") return err.message;
    return "Something went wrong. Try again.";
  }
  if (err instanceof TypeError) return "Could not reach LootLens. Check your connection and try again.";
  return "Something went wrong. Try again.";
}
