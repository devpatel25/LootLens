import { mkdirSync, writeFileSync } from "node:fs";
import { encode } from "next-auth/jwt";
import { assertNonProdDb } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";
import { seed } from "@/prisma/seed";
import { assertLocalDbHost } from "@/tests/helpers/db";

async function main(): Promise<void> {
  assertNonProdDb();
  assertLocalDbHost(process.env.DATABASE_URL);
  const { demoUserId } = await seed(prisma);
  // On http the cookie is authjs.session-token, and the salt must equal the cookie name.
  const name = "authjs.session-token";
  const value = await encode({
    token: { sub: demoUserId, id: demoUserId, email: "demo@lootlens.test", name: "Demo Shopper" },
    secret: process.env.AUTH_SECRET!,
    salt: name,
  });
  mkdirSync("e2e/.auth", { recursive: true });
  const cookie = {
    name, value, domain: "localhost", path: "/",
    expires: Math.floor(Date.now() / 1000) + 86400,
    httpOnly: true, secure: false, sameSite: "Lax",
  };
  writeFileSync("e2e/.auth/user.json", JSON.stringify({ cookies: [cookie], origins: [] }));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
