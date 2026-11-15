import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig, routeDecision } from "@/lib/authConfig";

// Built from authConfig only, so the proxy never loads Prisma.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const d = routeDecision(req.nextUrl.pathname, !!req.auth?.user?.id);
  if (d === "unauthorized") {
    return Response.json({ error: { code: "unauthorized", message: "Sign in required" } }, { status: 401 });
  }
  if (d === "redirect") return NextResponse.redirect(new URL("/signin", req.nextUrl));
});

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
