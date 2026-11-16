import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";
import { prisma } from "@/lib/prisma";

export async function ensureUserSettings(userId: string): Promise<void> {
  await prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function handleCreateUser({ user }: { user: { id?: string } }): Promise<void> {
  if (!user.id) return;
  // Never abort sign-in: Auth.js runs createUser before linkAccount, so a throw orphans the user.
  // The settings route falls back to defaults on read and upserts only on PATCH.
  try {
    await ensureUserSettings(user.id);
  } catch (e) {
    console.error("ensureUserSettings failed", e);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  events: {
    createUser: handleCreateUser,
  },
});
