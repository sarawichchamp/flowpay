import { type NextRequest, NextResponse } from "next/server";
import { getAppMode } from "@/services/flowpay/app-mode";
import { householdAccessCookieName, isHouseholdAccessConfigured } from "@/services/flowpay/access";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const isUnlockRoute = pathname.startsWith("/unlock");
  const isApiRoute = pathname.startsWith("/api");
  const isAuthRoute = pathname.startsWith("/auth");
  const isProtectedRoute = !isUnlockRoute && !isApiRoute && !isAuthRoute;

  if (getAppMode() === "production" && isHouseholdAccessConfigured()) {
    const accessCookie = request.cookies.get(householdAccessCookieName)?.value;

    if (!accessCookie && isProtectedRoute) {
      const unlockUrl = request.nextUrl.clone();
      unlockUrl.pathname = "/unlock";
      return NextResponse.redirect(unlockUrl);
    }

    if (accessCookie && (isUnlockRoute || pathname === "/auth/login")) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)"]
};
