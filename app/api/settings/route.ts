import { z } from "zod";
import { toSettings } from "@/lib/dto";
import { fail, isStaleUser, ok, parse, requireUserId } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const patchBody = z
  .object({ freshnessHours: z.literal([6, 12, 24, 48, 72]), firstOrderEligible: z.boolean() })
  .partial();

const stale = () => fail(401, "unauthorized", "Sign in required");

export async function GET(_req: Request) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  return ok(await getSettings(userId));
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const data = parse(patchBody, await req.json().catch(() => undefined));
  if (data instanceof Response) return data;
  try {
    return ok(toSettings(await prisma.userSettings.upsert({ where: { userId }, update: data, create: { userId, ...data } })));
  } catch (e) {
    if (isStaleUser(e)) return stale();
    throw e;
  }
}
