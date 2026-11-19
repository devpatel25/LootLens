import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig, routeDecision } from "@/lib/authConfig";
import { keepSignInPage, safeCallbackUrl, signInUrl } from "@/lib/signin";
import { unauthorizedResponse } from "@/lib/apiError";

// Built from authConfig only, so the proxy never loads Prisma.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const d = routeDecision(req.nextUrl.pathname, !!req.auth?.user?.id);
  if (d === "unauthorized") {
    return unauthorizedResponse();
  }
  if (d === "redirect") return NextResponse.redirect(new URL(signInUrl(req.nextUrl.pathname, req.nextUrl.search), req.nextUrl));
  // Only page visits are sent on. A sign-in POST (server action) from a stale tab must reach /signin itself,
  // and so must a visit with an error to show or a request to sign in again (keepSignInPage).
  if (d === "leave-signin" && (req.method === "GET" || req.method === "HEAD") && !keepSignInPage(req.nextUrl.searchParams)) {
    return NextResponse.redirect(new URL(safeCallbackUrl(req.nextUrl.searchParams.get("callbackUrl") ?? undefined), req.nextUrl));
  }
});

// Only root-level public files skip the proxy. Sign-in page assets must stay at the root, or use static
// imports / next/font (served from /_next/static).
// /api/* is always matched, even dotted paths. Static assets and metadata files stay public.
export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|[^/]+\\.(?:svg|png|jpe?g|gif|webp|ico|SVG|PNG|JPE?G|GIF|WEBP|ICO)$).*)",
  ],
};
