import { beforeEach, describe, expect, it } from "vitest";
import { ensureUserSettings } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/tests/helpers/db";


describe("ensureUserSettings", () => {
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    userId = (await prisma.user.create({ data: { email: "new@lootlens.test" } })).id;
  });

  it("creates a settings row with schema defaults", async () => {
    await ensureUserSettings(userId);
    const row = await prisma.userSettings.findUnique({ where: { userId } });
    expect(row).toMatchObject({ freshnessHours: 24, firstOrderEligible: false });
  });

  it("is safe to call twice", async () => {
    await ensureUserSettings(userId);
    await ensureUserSettings(userId);
    expect(await prisma.userSettings.count({ where: { userId } })).toBe(1);
  });
});
