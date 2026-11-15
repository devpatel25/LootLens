import { pathToFileURL } from "node:url";
import { assertNonProdDb } from "@/lib/db-guard";
import type { PrismaClient } from "@/lib/generated/prisma/client";

// Stub: real implementation follows the red commit.
export async function seed(db: PrismaClient, now = new Date()): Promise<{ demoUserId: string }> {
  void db;
  void now;
  void assertNonProdDb;
  return { demoUserId: "" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void (async () => {
    const { prisma } = await import("@/lib/prisma");
    await seed(prisma);
    await prisma.$disconnect();
  })();
}
