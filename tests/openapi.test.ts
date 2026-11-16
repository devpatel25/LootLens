import { readdirSync, readFileSync } from "node:fs";
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

const paths = spec.paths as unknown as Record<string, Record<string, { responses: Record<string, unknown> }>>;
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

// Fixtures hold the unwrapped payload, so each one maps to a component schema by hand.
const FIXTURES: Record<string, string> = {
  "alerts.json": "AlertsResponse",
  "codes-all.json": "Code",
  "codes.json": "Code",
  "comparison.json": "ItemComparison",
  "settings.json": "Settings",
  "wishlist.json": "WishlistItem",
};

type Schema = {
  $ref?: string;
  allOf?: Schema[];
  oneOf?: Schema[];
  type?: string | string[];
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
};
const schemas = (spec.components.schemas as unknown) as Record<string, Schema>;
const read = (file: string) => JSON.parse(readFileSync(join(process.cwd(), "fixtures", file), "utf8"));

const resolve = (s: Schema): Schema => (s.$ref ? resolve(schemas[s.$ref.split("/").pop()!]) : s);

/** Properties (each with every schema that declares it) and required names, following $ref and allOf. */
function collect(schema: Schema, out = { props: {} as Record<string, Schema[]>, required: new Set<string>() }) {
  const s = resolve(schema);
  s.allOf?.forEach((p) => collect(p, out));
  for (const [k, v] of Object.entries(s.properties ?? {})) (out.props[k] ??= []).push(v);
  s.required?.forEach((k) => out.required.add(k));
  return out;
}

/** Problems found when value does not fit schema. Walks arrays and nested objects. oneOf matches any branch. */
function check(schema: Schema, value: unknown, at = "$"): string[] {
  const s = resolve(schema);
  if (s.oneOf) {
    const tries = s.oneOf.map((b) => check(b, value, at));
    return tries.some((t) => t.length === 0) ? [] : tries[0];
  }
  const types = ([] as string[]).concat(s.type ?? []);
  if (value === null) return types.length === 0 || types.includes("null") ? [] : [`${at} is null`];
  if (Array.isArray(value)) {
    return s.items ? value.flatMap((v, i) => check(s.items!, v, `${at}[${i}]`)) : [];
  }
  if (typeof value !== "object") return [];
  const { props, required } = collect(s);
  if (Object.keys(props).length === 0 && required.size === 0) return []; // free-form map, such as stockBySize
  const data = value as Record<string, unknown>;
  return [
    ...Object.keys(data).filter((k) => !(k in props)).map((k) => `${at}.${k} not in schema`),
    ...[...required].filter((k) => !(k in data)).map((k) => `${at}.${k} missing`),
    ...Object.keys(data).filter((k) => k in props).flatMap((k) => props[k].flatMap((p) => check(p, data[k], `${at}.${k}`))),
  ];
}

describe("fixtures match the spec", () => {
  it("maps every fixture file", () => {
    const files = readdirSync(join(process.cwd(), "fixtures")).filter((f) => f.endsWith(".json"));
    expect(files.sort()).toEqual(Object.keys(FIXTURES).sort());
  });

  it.each(Object.entries(FIXTURES))("%s fits %s", (file, name) => {
    expect(check({ $ref: `#/components/schemas/${name}` }, read(file))).toEqual([]);
  });

  it("catches a nested required field that is removed", () => {
    const data = structuredClone(read("comparison.json"));
    delete data.stores[0].trust;
    expect(check({ $ref: "#/components/schemas/ItemComparison" }, data)).toContain("$.stores[0].trust missing");
  });

  it("catches a nested key that is not in the schema", () => {
    const data = structuredClone(read("comparison.json"));
    data.listings[0].extra = 1;
    expect(check({ $ref: "#/components/schemas/ItemComparison" }, data)).toContain("$.listings[0].extra not in schema");
  });
});
