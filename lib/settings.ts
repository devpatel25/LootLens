import { toSettings } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import type { Settings } from "@/lib/types";

const DEFAULTS: Settings = { freshnessHours: 24, firstOrderEligible: false };

// Lives here, not in lib/auth.ts, so route tests that mock @/lib/auth still get it.
// Read only: the row is created by sign-in or by PATCH /api/settings.
export async function getSettings(userId: string): Promise<Settings> {
  const row = await prisma.userSettings.findUnique({ where: { userId } });
  return row ? toSettings(row) : DEFAULTS;
}
