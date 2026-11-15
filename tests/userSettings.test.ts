import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureUserSettings, handleCreateUser } from "@/lib/auth";
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

describe("handleCreateUser", () => {
  it("resolves when the settings write fails, so sign-in is not aborted", async () => {
    vi.spyOn(prisma.userSettings, "upsert").mockRejectedValue(new Error("db down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(handleCreateUser({ user: { id: "u1" } })).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
});
