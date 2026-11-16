import { z } from "zod";
import { toCode } from "@/lib/dto";
import { fail, isMissingRow, isStaleUser, ok, parse, requireUserId } from "@/lib/http";
import { idParams } from "@/lib/itemSchema";
import { prisma } from "@/lib/prisma";

const body = z.object({ status: z.enum(["live", "dead"]) });

export async function PATCH(req: Request, ctx: RouteContext<"/api/codes/[id]">) {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const params = parse(idParams, await ctx.params);
  if (params instanceof Response) return params;
  const b = parse(body, await req.json().catch(() => undefined));
  if (b instanceof Response) return b;

  if (!(await prisma.code.findUnique({ where: { id: params.id }, select: { id: true } }))) {
    return fail(404, "not_found", "Code not found");
  }
  try {
    const { count } = await prisma.code.updateMany({
      where: { id: params.id },
      data: { status: b.status === "live" ? "LIVE" : "DEAD", lastCheckedAt: new Date(), lastCheckedById: userId },
    });
    const row = count === 0 ? null : await prisma.code.findUnique({ where: { id: params.id }, include: { store: true } });
    return row ? ok(toCode(row)) : fail(404, "not_found", "Code not found");
  } catch (e) {
    if (isMissingRow(e)) return fail(404, "not_found", "Code not found");
    if (isStaleUser(e)) return fail(401, "unauthorized", "Sign in required");
    throw e;
  }
}
