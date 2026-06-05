import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  getApprovalStatusPath,
  getSignInPath,
} from "@/lib/auth-routing";
import { getEnv } from "@/lib/env";

const env = getEnv();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL(
      getSignInPath(pathname, { auto: true }),
      request.url,
    );
    return NextResponse.redirect(signInUrl);
  }

  if (token.status !== "APPROVED") {
    const pendingUrl = new URL(
      getApprovalStatusPath(
        token.status === "BLOCKED" ? "BLOCKED" : "PENDING",
      ),
      request.url,
    );
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
    "/questions/:path*",
    "/ai-tutor/:path*",
    "/chunks/:path*",
    "/practice/:path*",
    "/review/:path*",
    "/progress/:path*",
    "/admin/:path*",
  ],
};
