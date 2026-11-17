import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";
import { prisma } from "@/lib/prisma";

export async function ensureUserSettings(userId: string): Promise<void> {
  await prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function handleCreateUser({ user }: { user: { id?: string } }): Promise<void> {
  if (!user.id) return;
  // @auth/core already catches and logs errors thrown in event handlers (eventsErrorHandler), so this
  // try/catch is an explicit safety net, not load-bearing. Sign-in must not abort here: createUser runs
  // before linkAccount, so a throw would orphan the user.
  // The settings route also upserts defaults on read (a later PR).
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
