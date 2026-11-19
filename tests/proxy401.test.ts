import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import proxy from "@/proxy";
import { unauthorized } from "@/lib/http";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("proxy 401", () => {
  it("signed-out /api request gets the same status and body as a route 401", async () => {
    const res = (await (proxy as unknown as (r: NextRequest) => Promise<Response>)(new NextRequest("http://localhost/api/items"))) as Response;
    const route = unauthorized();
    expect(res.status).toBe(401);
    expect(res.status).toBe(route.status);
    expect(await res.json()).toEqual(await route.json());
  });
});
