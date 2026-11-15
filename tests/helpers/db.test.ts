import { describe, expect, it } from "vitest";
import { assertLocalDbHost } from "@/tests/helpers/db";

describe("assertLocalDbHost", () => {
  it.each([
    "postgresql://u:p@ep-x.region.aws.neon.tech/db",
    "postgresql://u:p@db.example.com:5432/db",
    "not a url",
    "",
    undefined,
  ])("rejects %j", (value) => {
    expect(() => assertLocalDbHost(value)).toThrow(/local/);
  });

  it.each([
    "postgresql://u:p@localhost:5433/db",
    "postgresql://u:p@127.0.0.1:5432/db",
    "postgresql://u:p@[::1]:5432/db",
  ])("accepts %s", (value) => {
    expect(() => assertLocalDbHost(value)).not.toThrow();
  });
});
