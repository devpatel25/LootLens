import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { isUnder } from "@/lib/paths";

const PUBLIC = ["/signin", "/api/auth", "/api/health", "/api/cron/refresh", "/api-docs", "/openapi.json"];

export function routeDecision(pathname: string, signedIn: boolean): "next" | "redirect" | "unauthorized" | "leave-signin" {
  // A signed-in visit to the sign-in page goes on to its callbackUrl, so the page itself never reads the session.
  if (signedIn) return isUnder(pathname, "/signin") ? "leave-signin" : "next";
  if (PUBLIC.some((p) => isUnder(pathname, p))) return "next";
  return isUnder(pathname, "/api") ? "unauthorized" : "redirect";
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
