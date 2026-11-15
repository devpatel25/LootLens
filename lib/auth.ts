import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";
import { prisma } from "@/lib/prisma";

export { callbacks } from "@/lib/authConfig";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
});
