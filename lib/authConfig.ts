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
  // Auth.js sends sign-in errors to `signIn` and the rest (AccessDenied, Configuration) to `error`. Both go to
  // our page, which turns the ?error= code into a plain message (lib/signin.ts).
  pages: { signIn: "/signin", error: "/signin" },
  callbacks,
} satisfies NextAuthConfig;

// Server code also imports signInUrl from here; it lives in lib/signin.ts so client links can use it.
export { signInUrl } from "@/lib/signin";
