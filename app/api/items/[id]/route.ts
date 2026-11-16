import { fail } from "@/lib/http";

export const GET = async (_req: Request, _ctx: RouteContext<"/api/items/[id]">) => fail(501, "not_implemented", "Not implemented");
export const PATCH = async (_req: Request, _ctx: RouteContext<"/api/items/[id]">) => fail(501, "not_implemented", "Not implemented");
export const DELETE = async (_req: Request, _ctx: RouteContext<"/api/items/[id]">) => fail(501, "not_implemented", "Not implemented");
