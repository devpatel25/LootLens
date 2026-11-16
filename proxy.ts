import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig, routeDecision, signInUrl } from "@/lib/authConfig";
import { safeCallbackUrl } from "@/lib/signin";

// Built from authConfig only, so the proxy never loads Prisma.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const d = routeDecision(req.nextUrl.pathname, !!req.auth?.user?.id);
  if (d === "unauthorized") {
    return Response.json({ error: { code: "unauthorized", message: "Sign in required" } }, { status: 401 });
  }
  if (d === "redirect") return NextResponse.redirect(new URL(signInUrl(req.nextUrl.pathname, req.nextUrl.search), req.nextUrl));
  // Only page visits are sent on. A sign-in POST (server action) from a stale tab must reach /signin itself.
  if (d === "leave-signin" && (req.method === "GET" || req.method === "HEAD")) {
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
