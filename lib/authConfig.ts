import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const PUBLIC = ["/signin", "/api/auth", "/api/health", "/api/cron/refresh", "/api-docs", "/openapi.json", "/swagger-ui"];

export function routeDecision(pathname: string, signedIn: boolean): "next" | "redirect" | "unauthorized" {
  if (signedIn || PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "next";
  return pathname === "/api" || pathname.startsWith("/api/") ? "unauthorized" : "redirect";
}

export const callbacks = {
  session({ session, token }) {
    if (token.sub) session.user.id = token.sub;
    return session;
  },
} satisfies NextAuthConfig["callbacks"];

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks,
} satisfies NextAuthConfig;

export function signInUrl(pathname: string, search: string): string {
  return `/signin?callbackUrl=${encodeURIComponent(pathname + search)}`;
}
