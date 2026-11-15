import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";
import { prisma } from "@/lib/prisma";

export async function ensureUserSettings(userId: string): Promise<void> {
  await prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  events: {
    async createUser({ user }) {
      if (user.id) await ensureUserSettings(user.id);
    },
  },
});
