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

/** Calls a LootLens API route from the browser. Returns `data` or throws ApiClientError. */
export async function apiFetch<T>(url: string, init: { method?: string; json?: unknown } = {}): Promise<T> {
  void url; void init;
  return undefined as T;
}

/** Plain message to show the shopper for any thrown error. */
export function friendlyMessage(err: unknown): string {
  void err;
  return "";
}
