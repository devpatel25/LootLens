import { randomUUID } from "node:crypto";
import { assertNonProdDb } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";

export async function resetDb(): Promise<void> {
  assertNonProdDb();
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

export async function makeUser(email = `u-${randomUUID()}@test.local`): Promise<string> {
  const user = await prisma.user.create({ data: { email } });
  return user.id;
}
