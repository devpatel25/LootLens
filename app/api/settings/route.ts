import { z } from "zod";
import { toSettings } from "@/lib/dto";
import { ok, parse, requireUserId, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const patchBody = z
  .object({ freshnessHours: z.literal([6, 12, 24, 48, 72]), firstOrderEligible: z.boolean() })
  .partial();

export const GET = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  return ok(await getSettings(userId));
});

export const PATCH = route(async (req: Request) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const data = parse(patchBody, await req.json().catch(() => undefined));
  if (data instanceof Response) return data;
  return ok(toSettings(await prisma.userSettings.upsert({ where: { userId }, update: data, create: { userId, ...data } })));
});
