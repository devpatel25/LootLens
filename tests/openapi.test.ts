import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import spec from "@/public/openapi.json";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const API_DIR = join(process.cwd(), "app/api");
// Auth.js owns this route and it is not part of the documented API.
const EXCLUDED = new Set(["/api/auth/{...nextauth}"]);
// Public by design, so no 401.
const NO_401 = new Set(["/api/health"]);

const routeFiles = (readdirSync(API_DIR, { recursive: true }) as string[])
  .map((f) => f.split("\\").join("/"))
  .filter((f) => f === "route.ts" || f.endsWith("/route.ts"));

const routes = routeFiles
  .map((f) => ({
    file: f,
    path: ("/api/" + f.replace(/\/?route\.ts$/, "")).replace(/\/$/, "").replace(/\[([^\]]+)\]/g, "{$1}"),
  }))
  .filter((r) => !EXCLUDED.has(r.path));

const paths = spec.paths as Record<string, Record<string, { responses: Record<string, unknown> }>>;
const documented = (path: string) => Object.keys(paths[path] ?? {}).map((m) => m.toUpperCase()).filter((m) => METHODS.includes(m));

describe("openapi.json", () => {
  it("finds the route files", () => {
    expect(routes.length).toBeGreaterThan(10);
  });

  it.each(routes)("documents $path", async ({ file, path }) => {
    expect(paths[path], `${path} missing from openapi.json`).toBeDefined();
    const mod = await import(/* @vite-ignore */ `../app/api/${file}`);
    const exported = METHODS.filter((m) => typeof mod[m] === "function");
    expect(documented(path).sort()).toEqual(exported.sort());
  });

  it("has a route file for every documented path", () => {
    const real = new Set(routes.map((r) => r.path));
    expect(Object.keys(paths).filter((p) => !real.has(p))).toEqual([]);
  });

  it("lists a 401 on every operation except the public ones", () => {
    const missing: string[] = [];
    for (const [path, ops] of Object.entries(paths)) {
      if (NO_401.has(path)) continue;
      for (const m of documented(path)) if (!ops[m.toLowerCase()].responses["401"]) missing.push(`${m} ${path}`);
    }
    expect(missing).toEqual([]);
  });
});
