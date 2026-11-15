import { describe, expect, it } from "vitest";
import { assertNonProdDb, hostOf, isDestructivePrismaCommand } from "@/lib/db-guard";

const PROD = "ep-x.region.aws.neon.tech";
const url = (host: string) => `postgresql://u:secret@${host}/db`;

describe("assertNonProdDb rejects", () => {
  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["production", "production"],
    ["wrong case", "Local"],
    ["padded", " local"],
    ["staging", "staging"],
  ])("DB_TARGET %s", (_name, target) => {
    expect(() =>
      assertNonProdDb({ DB_TARGET: target, DATABASE_URL: url("dev.example.com") }),
    ).toThrow(/DB_TARGET/);
  });

  it("production host with VERCEL_ENV unset", () => {
    expect(() =>
      assertNonProdDb({ DB_TARGET: "local", DATABASE_URL: url(PROD), PROD_DB_HOST: PROD }),
    ).toThrow(/PROD_DB_HOST/);
  });

  it("host differing only by case", () => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: "local",
        DATABASE_URL: url(PROD.toUpperCase()),
        PROD_DB_HOST: PROD,
      }),
    ).toThrow(/PROD_DB_HOST/);
  });

  it("pooled host of the production database", () => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: "local",
        DATABASE_URL: url("ep-x-pooler.region.aws.neon.tech"),
        PROD_DB_HOST: PROD,
      }),
    ).toThrow(/PROD_DB_HOST/);
  });

  it.each([
    ["host:port", `${PROD}:5432`],
    ["full URL", `postgresql://user:pw@${PROD}/db`],
    ["uppercase with trailing dot", `${PROD.toUpperCase()}.`],
    ["host with a path and query", `${PROD}/db?sslmode=require`],
    ["host with userinfo", `user@${PROD}`],
    ["host with userinfo, port and path", `user:pw@${PROD}:5432/db`],
  ])("PROD_DB_HOST given as %s", (_name, prod) => {
    expect(() =>
      assertNonProdDb({ DB_TARGET: "local", DATABASE_URL: url(PROD), PROD_DB_HOST: prod }),
    ).toThrow(/PROD_DB_HOST/);
  });

  it("DATABASE_URL with a trailing-dot host", () => {
    expect(() =>
      assertNonProdDb({ DB_TARGET: "local", DATABASE_URL: url(`${PROD}.`), PROD_DB_HOST: PROD }),
    ).toThrow(/PROD_DB_HOST/);
  });

  it("DATABASE_URL_UNPOOLED pointing at production", () => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: "local",
        DATABASE_URL: url("dev.example.com"),
        DATABASE_URL_UNPOOLED: url(PROD),
        PROD_DB_HOST: PROD,
      }),
    ).toThrow(/PROD_DB_HOST/);
  });

  it("DATABASE_URL_UNPOOLED that does not parse", () => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: "local",
        DATABASE_URL: url("dev.example.com"),
        DATABASE_URL_UNPOOLED: "not a url",
      }),
    ).toThrow(/DATABASE_URL_UNPOOLED/);
  });

  it("preview target with VERCEL_ENV=production", () => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: "preview",
        VERCEL_ENV: "production",
        DATABASE_URL: url("dev.example.com"),
      }),
    ).toThrow(/VERCEL_ENV/);
  });

  it("VERCEL_ENV=preview with DB_TARGET unset", () => {
    expect(() =>
      assertNonProdDb({ VERCEL_ENV: "preview", DATABASE_URL: url("dev.example.com") }),
    ).toThrow(/DB_TARGET/);
  });

  it.each([
    ["unset", undefined],
    ["not a url", "not a url"],
    ["empty hostname", "postgresql:///db?host=/sock"],
  ])("DATABASE_URL %s", (_name, value) => {
    expect(() => assertNonProdDb({ DB_TARGET: "local", DATABASE_URL: value })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("never leaks the URL in the message", () => {
    let message = "";
    try {
      assertNonProdDb({ DB_TARGET: "local", DATABASE_URL: url(PROD), PROD_DB_HOST: PROD });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/PROD_DB_HOST/);
    expect(message).not.toMatch(/secret|neon/);
  });
});

describe("assertNonProdDb passes", () => {
  it.each(["local", "ci", "preview"])("DB_TARGET=%s with a different host", (target) => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: target,
        DATABASE_URL: url("dev.example.com"),
        PROD_DB_HOST: PROD,
      }),
    ).not.toThrow();
  });

  it.each([undefined, ""])("local with PROD_DB_HOST %j", (prod) => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: "local",
        DATABASE_URL: url("dev.example.com"),
        PROD_DB_HOST: prod,
      }),
    ).not.toThrow();
  });

  it("local with a safe UNPOOLED url, or an empty one", () => {
    for (const unpooled of [url("dev.example.com"), ""]) {
      expect(() =>
        assertNonProdDb({
          DB_TARGET: "local",
          DATABASE_URL: url("dev.example.com"),
          DATABASE_URL_UNPOOLED: unpooled,
          PROD_DB_HOST: PROD,
        }),
      ).not.toThrow();
    }
  });
});

describe("hostOf", () => {
  it.each([
    ["full URL", "postgresql://u:pw@db.example.com:5432/x", "db.example.com"],
    ["bare host", "db.example.com", "db.example.com"],
    ["host:port", "db.example.com:5432", "db.example.com"],
    ["path and query", "db.example.com/x?sslmode=require", "db.example.com"],
    ["userinfo", "u@db.example.com", "db.example.com"],
    ["ipv6", "postgresql://[::1]:5433/x", "[::1]"],
    ["empty", "", ""],
    ["undefined", undefined, ""],
  ])("%s", (_name, raw, host) => {
    expect(hostOf(raw)).toBe(host);
  });
});

describe("isDestructivePrismaCommand", () => {
  const argv = (...rest: string[]) => ["node", "node_modules/prisma/build/index.js", ...rest];
  it.each([
    ["migrate dev", ["migrate", "dev"]],
    ["migrate dev with flags", ["migrate", "dev", "--name", "x"]],
    ["migrate reset", ["migrate", "reset", "--force"]],
    ["db push", ["db", "push"]],
  ])("true for %s", (_name, rest) => {
    expect(isDestructivePrismaCommand(argv(...rest))).toBe(true);
  });
  it.each([
    ["migrate deploy", ["migrate", "deploy"]],
    ["migrate status", ["migrate", "status"]],
    ["migrate diff", ["migrate", "diff"]],
    ["generate", ["generate"]],
    ["db seed", ["db", "seed"]],
    ["no command", []],
  ])("false for %s", (_name, rest) => {
    expect(isDestructivePrismaCommand(argv(...rest))).toBe(false);
  });
});
