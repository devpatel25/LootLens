import { describe, expect, it } from "vitest";
import { assertLocalDbHost } from "@/tests/helpers/db";

describe("assertLocalDbHost", () => {
  it.each([
    "postgresql://u:p@ep-x.region.aws.neon.tech/db",
    "postgresql://u:p@db.example.com:5432/db",
    "postgresql://u:p@localhost:5433/lootlens",
    "postgresql://u:p@localhost/lootlens_test?host=ep-x.region.aws.neon.tech",
    "postgresql://u:p@localhost/lootlens_test?hostaddr=10.0.0.1",
    "postgresql://u:p@ep-x%2Eregion.aws.neon.tech/lootlens_test",
    "not a url",
    "",
    undefined,
  ])("rejects %j", (value) => {
    expect(() => assertLocalDbHost(value)).toThrow(/local|_test/);
  });

  it.each([
    "postgresql://u:p@localhost:5433/lootlens_test",
    "postgresql://u:p@127.0.0.1:5432/x_test",
    "postgresql://u:p@[::1]:5432/lootlens_test",
  ])("accepts %s", (value) => {
    expect(() => assertLocalDbHost(value)).not.toThrow();
  });
});
