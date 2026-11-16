import { z } from "zod";
import { toCode } from "@/lib/dto";
import { fail, isMissingRow, isStaleUser, ok, parse, requireUserId, route, unauthorized } from "@/lib/http";
import { idParams } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";

const body = z.object({ status: z.enum(["live", "dead"]) });

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/codes/[id]">) => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;
  const b = parse(body, await req.json().catch(() => undefined));
  if (b instanceof Response) return b;

  try {
    const row = await prisma.code.update({
      where: { id: params.id },
      data: { status: b.status === "live" ? "LIVE" : "DEAD", lastCheckedAt: new Date(), lastCheckedById: userId },
      include: { store: true },
    });
    return ok(toCode(row));
  } catch (e) {
    if (isMissingRow(e)) return fail(404, "not_found", "Code not found");
    if (isStaleUser(e)) return unauthorized();
    throw e;
  }
});
