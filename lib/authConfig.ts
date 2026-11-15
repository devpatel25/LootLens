import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const PUBLIC = ["/signin", "/api/auth", "/api/health", "/api/cron"];

export function routeDecision(pathname: string, signedIn: boolean): "next" | "redirect" | "unauthorized" {
  if (signedIn || PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "next";
  return pathname === "/api" || pathname.startsWith("/api/") ? "unauthorized" : "redirect";
}

export const callbacks = {
  jwt({ token, user }) {
    if (user?.id) token.id = user.id;
    return token;
  },
  session({ session, token }) {
    if (token.id) session.user.id = token.id;
    return session;
  },
} satisfies NextAuthConfig["callbacks"];

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks,
} satisfies NextAuthConfig;

export function signInUrl(_pathname: string, _search: string): string {
  return "/signin";
}
