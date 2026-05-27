import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { getEnv } from "@/lib/env";

const env = getEnv();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (token.status !== "APPROVED") {
    const pendingUrl = new URL("/auth/pending", request.url);
    pendingUrl.searchParams.set("status", String(token.status ?? "PENDING"));
    return NextResponse.redirect(pendingUrl);
  }

  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/learn/:path*",
    "/chunks/:path*",
    "/practice/:path*",
    "/review/:path*",
    "/progress/:path*",
    "/admin/:path*",
  ],
};
