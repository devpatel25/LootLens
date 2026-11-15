import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";
import { assertNonProdDb, isDestructivePrismaCommand } from "./lib/db-guard";

// dev=true so the CLI reads the same .env.local files as `next dev`. NODE_ENV=test still selects .env.test.
loadEnvConfig(process.cwd(), true);

// Every destructive CLI command passes the guard here, however it is invoked.
if (isDestructivePrismaCommand(process.argv)) assertNonProdDb();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Neon migrations need the direct (unpooled) URL.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "" },
});
