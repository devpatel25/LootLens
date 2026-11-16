export function req(path: string, method = "GET", body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });
}

export const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
