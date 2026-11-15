import { loadEnvConfig } from "@next/env";
import { assertNonProdDb } from "@/lib/db-guard";

// Runs before `prisma migrate dev`, loading env the same way prisma.config.ts does.
loadEnvConfig(process.cwd());
assertNonProdDb();
