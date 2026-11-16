import { toSettings } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import type { Settings } from "@/lib/types";

// Lives here, not in lib/auth.ts, so route tests that mock @/lib/auth still get it.
export async function getSettings(userId: string): Promise<Settings> {
  return toSettings(await prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } }));
}
