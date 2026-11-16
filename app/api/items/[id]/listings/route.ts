import { fail } from "@/lib/http";

export const GET = async (_req: Request, _ctx: RouteContext<"/api/items/[id]/listings">) => fail(501, "not_implemented", "Not implemented");
