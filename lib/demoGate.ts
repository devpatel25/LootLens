import { assertNonProdDb } from "@/lib/db-guard";
import { fail } from "@/lib/http";

/** True when the database target is clearly not production. Never throws. */
export function nonProdDb(): boolean {
  try {
    assertNonProdDb();
    return true;
  } catch {
    return false;
  }
}

/** Demo mode is on and the database is not production. */
export const demoEnabled = (): boolean => process.env.DEMO_MODE === "true" && nonProdDb();

/** Null when demo actions may run, else the response to send: 404 outside demo mode, 500 on a non-dev database. */
export function demoGate(): Response | null {
  if (process.env.DEMO_MODE !== "true") return fail(404, "not_found", "Not found");
  return nonProdDb() ? null : fail(500, "demo_disabled", "Demo actions are disabled for this database");
}
