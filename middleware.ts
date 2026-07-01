/**
 * Route protection for authenticated pages.
 * Keeps /dashboard and /onboarding behind login, and bounces signed-in users away from /login.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getProductionSiteUrl,
  LEGACY_SITE_HOSTNAMES,
} from "@/lib/site-url";
import { isGuestAuthEmail, isGuestAuthUser } from "@/lib/guest-auth";

const protectedRoutes = ["/dashboard", "/onboarding", "/admin"];

function isDashboardRoute(pathname: string) {
  return (
    pathname === "/dashboard" ||
    (pathname.startsWith("/dashboard/") &&
      !pathname.startsWith("/dashboard/match"))
  );
}

function isSoftNavigation(request: NextRequest) {
  return request.headers.get("RSC") === "1";
}

async function getPostAuthPathFromRequest(
  supabase: SupabaseClient,
  user: User
): Promise<"/dashboard" | "/onboarding" | "/guest"> {
  const withGuest = await supabase
    .from("users")
    .select("target_language, proficiency_level, is_guest, email")
    .eq("id", user.id)
    .maybeSingle();

  const data =
    !withGuest.error && withGuest.data
      ? withGuest.data
      : (
          await supabase
            .from("users")
            .select("target_language, proficiency_level, email")
            .eq("id", user.id)
            .maybeSingle()
        ).data;

  if (data?.target_language && data?.proficiency_level) {
    return "/dashboard";
  }

  const guestFlag =
    withGuest.data && "is_guest" in withGuest.data
      ? Boolean((withGuest.data as { is_guest?: boolean }).is_guest)
      : false;

  if (
    guestFlag ||
    isGuestAuthUser(user) ||
    isGuestAuthEmail(data?.email ?? user.email)
  ) {
    return "/guest";
  }

  return "/onboarding";
}

export async function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;

  if (
    LEGACY_SITE_HOSTNAMES.includes(
      host as (typeof LEGACY_SITE_HOSTNAMES)[number]
    )
  ) {
    const destination = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      getProductionSiteUrl()
    );
    return NextResponse.redirect(destination, 308);
  }

  const oauthError = request.nextUrl.searchParams.get("error");
  const oauthErrorCode = request.nextUrl.searchParams.get("error_code");
  if (
    oauthError &&
    (oauthErrorCode === "flow_state_already_used" ||
      oauthError === "invalid_request")
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "error",
      oauthErrorCode === "flow_state_already_used"
        ? "auth_session_expired"
        : "auth_callback_failed"
    );
    return NextResponse.redirect(loginUrl);
  }

  const { user, supabase, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isDashboardRoute(pathname) && user && !isSoftNavigation(request)) {
    const destination = await getPostAuthPathFromRequest(supabase, user);
    if (destination !== "/dashboard") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = destination;
      return NextResponse.redirect(nextUrl);
    }
  }

  if (pathname === "/onboarding" && user) {
    const destination = await getPostAuthPathFromRequest(supabase, user);
    if (destination === "/dashboard") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = "/dashboard";
      return NextResponse.redirect(nextUrl);
    }
    if (destination === "/guest") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = "/guest";
      return NextResponse.redirect(nextUrl);
    }
  }

  if ((pathname === "/login" || pathname === "/guest") && user) {
    const destination = await getPostAuthPathFromRequest(supabase, user);

    if (pathname === "/guest" && destination !== "/dashboard") {
      return supabaseResponse;
    }

    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = destination;
    return NextResponse.redirect(nextUrl);
  }

  if (
    pathname === "/login/reset-password" &&
    request.nextUrl.searchParams.has("code") &&
    !user
  ) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    callbackUrl.searchParams.set("next", "/login/reset-password");
    return NextResponse.redirect(callbackUrl);
  }

  if (pathname.startsWith("/login/reset-password") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "reset_link_expired");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/login/reset-password") && user) {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
