import { type NextRequest, NextResponse } from "next/server";
import { getAppMode, isSupabaseDemoMode } from "@/services/flowpay/app-mode";
import { isAuthenticatedHouseholdMember } from "@/services/flowpay/auth";
import { updateSession } from "@/services/supabase/proxy";
import { getSafeInternalPath } from "@/utils/navigation";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  if (isSupabaseDemoMode()) {
    return response;
  }

  const { pathname } = request.nextUrl;
  const requiresReauth = request.nextUrl.searchParams.get("reauth") === "1";
  const isUnlockRoute = pathname.startsWith("/unlock");
  const isApiRoute = pathname.startsWith("/api");
  const isAuthRoute = pathname.startsWith("/auth");
  const isProtectedRoute = !isUnlockRoute && !isApiRoute && !isAuthRoute;

  if (getAppMode() === "production") {
    const hasSupabaseSession = Boolean(user);

    if (!hasSupabaseSession && isProtectedRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("next", pathname === "/" ? "/" : `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    if (hasSupabaseSession) {
      const userId = user?.id;
      const nextPath = getSafeInternalPath(request.nextUrl.searchParams.get("next"));

      if (userId) {
        const isMember = await isAuthenticatedHouseholdMember(userId, user?.email).catch(() => false);

        if (!isMember && isProtectedRoute) {
          const loginUrl = request.nextUrl.clone();
          loginUrl.pathname = "/auth/login";
          loginUrl.searchParams.set("error", "not-member");
          return NextResponse.redirect(loginUrl);
        }
      }
      if (!requiresReauth && (isUnlockRoute || pathname === "/auth/login")) {
        const homeUrl = request.nextUrl.clone();
        homeUrl.pathname = nextPath;
        homeUrl.search = "";
        return NextResponse.redirect(homeUrl);
      }
    }

    if (pathname === "/unlock") {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/auth/login";
      homeUrl.search = request.nextUrl.search;
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)"]
};
