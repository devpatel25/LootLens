import type { Settings } from "@/lib/types";

export async function getSettings(_userId: string): Promise<Settings> {
  return { freshnessHours: 24, firstOrderEligible: false };
}
