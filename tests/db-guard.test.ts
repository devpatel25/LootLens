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

describe("assertNonProdDb requires PROD_DB_HOST off loopback", () => {
  it.each([undefined, ""])("preview with a non-loopback host and PROD_DB_HOST %j", (prod) => {
    expect(() =>
      assertNonProdDb({ DB_TARGET: "preview", DATABASE_URL: url(PROD), PROD_DB_HOST: prod }),
    ).toThrow(/PROD_DB_HOST/);
  });
  it("loopback DATABASE_URL but a remote UNPOOLED url", () => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: "local",
        DATABASE_URL: url("localhost"),
        DATABASE_URL_UNPOOLED: url(PROD),
      }),
    ).toThrow(/PROD_DB_HOST/);
  });
});

describe("assertNonProdDb rejects whitespace and control characters", () => {
  it.each([
    ["tab inside the scheme", `postgresql:/\t/u:p@${PROD}/db`],
    ["newline", `postgresql://u:p@${PROD}/db\nx`],
    ["space", `postgresql://u:p@${PROD} /db`],
    ["NUL", `postgresql://u:p@${PROD}\u0000/db`],
  ])("DATABASE_URL with %s", (_n, u) => {
    expect(() => assertNonProdDb({ DB_TARGET: "local", PROD_DB_HOST: PROD, DATABASE_URL: u })).toThrow(
      /DATABASE_URL/,
    );
  });
  it("DATABASE_URL_UNPOOLED with a tab", () => {
    expect(() =>
      assertNonProdDb({
        DB_TARGET: "local",
        PROD_DB_HOST: PROD,
        DATABASE_URL: url("dev.example.com"),
        DATABASE_URL_UNPOOLED: `postgresql:/\t/u:p@${PROD}/db`,
      }),
    ).toThrow(/DATABASE_URL_UNPOOLED/);
  });
});

describe("assertNonProdDb rejects URL host tricks", () => {
  const env = (extra: Record<string, string>) => ({ DB_TARGET: "local", PROD_DB_HOST: PROD, ...extra });
  it.each([
    ["host query param", `postgresql://u:p@localhost/db?host=${PROD}`],
    ["hostaddr query param", "postgresql://u:p@localhost/db?hostaddr=10.0.0.1"],
    ["percent-encoded host", "postgresql://u:p@ep-x%2Eregion.aws.neon.tech/db"],
  ])("DATABASE_URL with %s", (_n, u) => {
    expect(() => assertNonProdDb(env({ DATABASE_URL: u }))).toThrow();
  });
  it("DATABASE_URL_UNPOOLED with a host query param", () => {
    expect(() =>
      assertNonProdDb(
        env({ DATABASE_URL: url("localhost"), DATABASE_URL_UNPOOLED: `postgresql://u:p@localhost/db?host=${PROD}` }),
      ),
    ).toThrow();
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

  it.each([undefined, ""])("local on a loopback host with PROD_DB_HOST %j", (prod) => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(() =>
        assertNonProdDb({ DB_TARGET: "local", DATABASE_URL: url(host), PROD_DB_HOST: prod }),
      ).not.toThrow();
    }
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
    ["db pull", ["db", "pull"]],
    ["db execute", ["db", "execute", "--file", "x.sql"]],
    ["migrate resolve", ["migrate", "resolve", "--applied", "x"]],
    ["studio", ["studio"]],
    ["studio with a port", ["studio", "--port", "5555"]],
    ["unknown command", ["something-new"]],
    ["flag before reset", ["migrate", "--preview-feature", "reset", "--force"]],
    ["config before reset", ["migrate", "--config", "prisma.config.ts", "reset"]],
    ["config=value before reset", ["migrate", "--config=prisma.config.ts", "reset"]],
    ["flag before push", ["db", "--preview-feature", "push"]],
    ["telemetry flag before dev", ["migrate", "--telemetry-information", "x", "dev"]],
    ["flag before the command", ["--preview-feature", "migrate", "reset"]],
    ["safe command followed by a destructive one", ["--bogus", "generate", "migrate", "reset"]],
    ["help-less migrate", ["migrate"]],
  ])("true for %s", (_name, rest) => {
    expect(isDestructivePrismaCommand(argv(...rest))).toBe(true);
  });
  it.each([
    ["migrate deploy", ["migrate", "deploy"]],
    ["migrate status", ["migrate", "status"]],
    ["migrate diff", ["migrate", "diff", "--from-config-datasource", "--to-schema", "x.prisma", "--exit-code"]],
    ["migrate deploy with config", ["migrate", "--config", "prisma.config.ts", "deploy"]],
    ["migrate deploy with preview flag", ["migrate", "--preview-feature", "deploy"]],
    ["generate", ["generate"]],
    ["generate with flags", ["generate", "--schema", "prisma/schema.prisma", "--no-hints"]],
    ["validate", ["validate"]],
    ["format", ["format"]],
    ["version", ["version"]],
    ["version flag", ["--version"]],
    ["help flag", ["--help"]],
    ["db seed", ["db", "seed"]],
    ["no command", []],
  ])("false for %s", (_name, rest) => {
    expect(isDestructivePrismaCommand(argv(...rest))).toBe(false);
  });
});
