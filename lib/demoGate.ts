import { assertNonProdDb } from "@/lib/db-guard";
import { fail } from "@/lib/http";

/** Null when demo actions may run, else the response to send: 404 outside demo mode, 500 on a non-dev database. */
export function demoGate(): Response | null {
  if (process.env.DEMO_MODE !== "true") return fail(404, "not_found", "Not found");
  try {
    assertNonProdDb();
  } catch {
    return fail(500, "demo_disabled", "Demo actions are disabled for this database");
  }
  return null;
}
