import { assertNonProdDb, hostOf } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";

// Vitest never loads .env.local, so PROD_DB_HOST is unset here. Truncate only on a local host.
export function assertLocalDbHost(url: string | undefined): void {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(hostOf(url))) {
    throw new Error("resetDb: DATABASE_URL host must be local");
  }
  // hostOf already parsed it, so this cannot throw.
  if (!new URL(url!).pathname.slice(1).endsWith("_test")) {
    throw new Error("resetDb: database name must end with _test");
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
