import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { canonicalApplicationOrigin } from "@/lib/security/origin";
import { siteIndexingEnabled } from "@/lib/site-indexing";

/**
 * Edge-safe proxy (dulu `middleware`). Hanya cek keberadaan cookie sesi —
 * verifikasi role/entitlement dilakukan di Server Component / Route Handler.
 */
const PROTECTED = [
  "/dashboard",
  "/invitations",
  "/builder",
  "/media",
  "/billing",
  "/settings",
  "/admin",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  let response = NextResponse.next();
  if (needsAuth && !getSessionCookie(request)) {
    const url = new URL("/login", canonicalApplicationOrigin());
    url.searchParams.set("next", pathname);
    response = NextResponse.redirect(url);
  }
  if (!siteIndexingEnabled()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
