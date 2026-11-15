import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";
import { prisma } from "@/lib/prisma";

// Stub: replaced in the next commit.
export async function ensureUserSettings(_userId: string): Promise<void> {}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
});
