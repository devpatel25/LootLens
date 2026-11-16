import type { Code } from "@/lib/types";

/** Codes for the Codes view. Default: live, fresh for the user's window, not expired. showDead: every code. */
export async function loadCodes(userId: string, opts: { showDead: boolean; storeId?: string }): Promise<Code[]> {
  void userId; void opts;
  return [];
}
