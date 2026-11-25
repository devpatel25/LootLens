import { mkdirSync, writeFileSync } from "node:fs";
import { encode } from "next-auth/jwt";
import { assertNonProdDb } from "@/lib/db-guard";
import { prisma } from "@/lib/prisma";
import { loadCatalog } from "@/prisma/catalog";
import { seed } from "@/prisma/seed";
import { assertLocalDbHost } from "@/tests/helpers/db";

async function main(): Promise<void> {
  assertNonProdDb();
  assertLocalDbHost(process.env.DATABASE_URL);
  const { demoUserId } = await seed(prisma);
  // Then the catalog, as on a deploy: it adds TARGET10, a demo code no one has checked yet.
  await loadCatalog(prisma);
  // On http the cookie is authjs.session-token, and the salt must equal the cookie name.
  const name = "authjs.session-token";
  const value = await encode({
    token: { sub: demoUserId, email: "demo@lootlens.test", name: "Demo Shopper" },
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

  // A second signed-in user whose settings tests can change without affecting specs that use the demo
  // shopper in parallel (settings are per user; codes are shared, so this user sees the same codes).
  const other = await prisma.user.upsert({
    where: { email: "settings@lootlens.test" },
    update: {},
    create: { email: "settings@lootlens.test", name: "Settings Tester" },
  });
  await prisma.userSettings.deleteMany({ where: { userId: other.id } });
  // This user never has items, so its Alerts screen is always empty (a11y.spec.ts scans that state).
  // Watches and alerts go with their items.
  await prisma.item.deleteMany({ where: { userId: other.id } });
  const otherValue = await encode({
    token: { sub: other.id, email: "settings@lootlens.test", name: "Settings Tester" },
    secret: process.env.AUTH_SECRET!,
    salt: name,
  });
  writeFileSync("e2e/.auth/settings-user.json", JSON.stringify({ cookies: [{ ...cookie, value: otherValue }], origins: [] }));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
