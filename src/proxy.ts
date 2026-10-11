import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic check only: send visitors without a session cookie to /login
 * before rendering. The real verification happens against the database in
 * the data layer (requireUser) and inside every Server Action.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("rk_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/expenses/:path*",
    "/balances/:path*",
    "/rooms/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
