/**
 * Route protection for authenticated pages.
 * Keeps /dashboard and /onboarding behind login, and bounces signed-in users away from /login.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import {
  getProductionSiteUrl,
  LEGACY_SITE_HOSTNAMES,
} from "@/lib/site-url";
import { getPostAuthPathForUser } from "@/lib/auth";
import { isEmailVerifiedUser } from "@/lib/guest-auth";

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

  if (user && !isEmailVerifiedUser(user)) {
    await supabase.auth.signOut();

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "email_not_verified");

    if (pathname !== "/login") {
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

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
    const destination = await getPostAuthPathForUser(supabase, user);
    if (destination !== "/dashboard") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = destination;
      return NextResponse.redirect(nextUrl);
    }
  }

  if (pathname === "/onboarding" && user) {
    const destination = await getPostAuthPathForUser(supabase, user);
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

  if (pathname.startsWith("/login/reset-password")) {
    if (request.nextUrl.searchParams.has("code")) {
      const callbackUrl = request.nextUrl.clone();
      callbackUrl.pathname = "/auth/callback";
      callbackUrl.searchParams.set("next", "/login/reset-password");
      return NextResponse.redirect(callbackUrl);
    }

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "reset_link_expired");
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  // After a successful password reset we always show login (never bounce to dashboard).
  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.get("success") === "password_reset"
  ) {
    if (user) {
      await supabase.auth.signOut({ scope: "global" });
    }

    for (const cookie of request.cookies.getAll()) {
      if (
        cookie.name.startsWith("sb-") ||
        cookie.name.includes("auth-token") ||
        cookie.name.includes("code-verifier")
      ) {
        supabaseResponse.cookies.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
        });
      }
    }

    return supabaseResponse;
  }

  // A signed-in user with an expired reset link can still set a new password.
  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.get("error") === "reset_link_expired" &&
    user
  ) {
    const resetUrl = request.nextUrl.clone();
    resetUrl.pathname = "/login/reset-password";
    resetUrl.search = "";
    return NextResponse.redirect(resetUrl);
  }

  // Signed-in users on /login normally bounce away — except right after password reset.
  if ((pathname === "/login" || pathname === "/guest") && user) {
    const destination = await getPostAuthPathForUser(supabase, user);

    if (pathname === "/guest" && destination !== "/dashboard") {
      return supabaseResponse;
    }

    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = destination;
    return NextResponse.redirect(nextUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/confirm|auth/sign-out|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
