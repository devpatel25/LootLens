import { randomUUID } from "node:crypto";
import { assertNonProdDb } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";

// Vitest never loads .env.local, so PROD_DB_HOST is unset here. Truncate only on a local host.
export function assertLocalDbHost(url: string | undefined): void {
  let host = "";
  try {
    host = new URL(url ?? "").hostname;
  } catch {
    // falls through to the throw
  }
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(host)) {
    throw new Error("resetDb: DATABASE_URL host must be local");
  }
}

export async function resetDb(): Promise<void> {
  assertNonProdDb();
  assertLocalDbHost(process.env.DATABASE_URL);
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
