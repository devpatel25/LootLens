import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export function routeDecision(_pathname: string, _signedIn: boolean): "next" | "redirect" | "unauthorized" {
  return "next";
}

export const callbacks = {
  jwt({ token }) {
    return token;
  },
  session({ session }) {
    return session;
  },
} satisfies NextAuthConfig["callbacks"];

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks,
} satisfies NextAuthConfig;
