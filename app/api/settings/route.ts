import { fail } from "@/lib/http";

export const GET = async (_req: Request, _ctx?: unknown) => fail(501, "not_implemented", "Not implemented");
export const PATCH = async (_req: Request, _ctx?: unknown) => fail(501, "not_implemented", "Not implemented");
