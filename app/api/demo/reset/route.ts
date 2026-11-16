import { demoGate } from "@/lib/demoGate";
import { ok, requireUserId, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";

// The seed replaces the demo user's items (with listings, watches and alerts via cascade) and the seed codes,
// and upserts the stores. Other users' rows are kept.
export const POST = route(async () => {
  const userId = await requireUserId();
  if (userId instanceof Response) return userId;
  const gate = demoGate();
  if (gate) return gate;
  return ok(await seed(prisma));
});
