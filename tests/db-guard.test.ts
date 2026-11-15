import { describe, expect, it } from "vitest";
import { assertNonProdDb } from "@/lib/db-guard";

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
});
