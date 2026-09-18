import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 "Proxy" (formerly Middleware). Optimistic auth gate only:
 * it checks for the presence of the backend `refresh_token` cookie and does
 * NOT verify it (the refresh secret must not reach the edge). Real identity
 * and role checks happen client-side in each portal's <PortalGuard>.
 *
 * Redirecting an already-signed-in user away from /sign-in is left to the
 * sign-in page itself (it knows the resolved role) to avoid a redirect loop
 * with the "/" -> "/sign-in" server redirect.
 */

const PORTAL_PREFIXES = [
  "/admin",
  "/teacher",
  "/student",
  "/principal",
  "/academic-affairs",
  "/student-affairs",
  "/controller-of-examination",
  "/account",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("refresh_token");
  const isPortal = PORTAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isPortal && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/principal/:path*",
    "/academic-affairs/:path*",
    "/student-affairs/:path*",
    "/controller-of-examination/:path*",
    "/account/:path*",
  ],
};
