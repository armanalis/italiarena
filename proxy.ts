/**
 * Route protection for authenticated pages.
 * Keeps the app pages, /onboarding and /admin behind login, sends signed-in players
 * who have not finished onboarding there first, and bounces them away from /login.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import {
  getProductionSiteUrl,
  LEGACY_SITE_HOSTNAMES,
} from "@/lib/site-url";
import { getPostAuthPathForUser } from "@/lib/auth";
import { isEmailVerifiedUser } from "@/lib/guest-auth";

/**
 * Pages of the signed-in app. "/" is not here: it is the Arena for players
 * and the landing page for visitors. KEEP IN SYNC with app/(app).
 */
const APP_ROUTES = [
  "/wordle",
  "/word-wheel",
  "/stats",
  "/recent",
  "/leaderboard",
  "/settings",
  "/contribute",
  "/challenge",
  "/match",
  "/matchmaking",
];
const protectedRoutes = [...APP_ROUTES, "/onboarding", "/admin"];

function isUnder(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** App pages that need finished onboarding; a match in progress never bounces. */
function isAppRoute(pathname: string) {
  return (
    pathname === "/" ||
    APP_ROUTES.some(
      (route) => route !== "/match" && route !== "/matchmaking" && isUnder(pathname, route)
    )
  );
}

/**
 * The page a signed-out visitor asked for (a shared challenge or Wordle).
 * Set on the way to /login, used once they first reach "/" signed in and
 * onboarded: that covers email, Google, sign-up and guest flows alike.
 */
const AFTER_LOGIN_COOKIE = "after_login";

function isSoftNavigation(request: NextRequest) {
  return request.headers.get("RSC") === "1";
}

export async function proxy(request: NextRequest) {
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

  const isProtectedRoute = protectedRoutes.some((route) => isUnder(pathname, route));

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(AFTER_LOGIN_COOKIE, `${pathname}${request.nextUrl.search}`, {
      httpOnly: true,
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  if (isAppRoute(pathname) && user && !isSoftNavigation(request)) {
    const destination = await getPostAuthPathForUser(supabase, user);
    if (destination !== "/") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = destination;
      return NextResponse.redirect(nextUrl);
    }
  }

  if (pathname === "/onboarding" && user) {
    const destination = await getPostAuthPathForUser(supabase, user);
    if (destination === "/") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = "/";
      return NextResponse.redirect(nextUrl);
    }
    if (destination === "/guest") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = "/guest";
      return NextResponse.redirect(nextUrl);
    }
  }

  const afterLogin = request.cookies.get(AFTER_LOGIN_COOKIE)?.value;
  if (afterLogin && user && pathname === "/") {
    if ((await getPostAuthPathForUser(supabase, user)) === "/") {
      const target = new URL(afterLogin, request.url);
      // Same site only: a doctored cookie must not send players elsewhere.
      const response = NextResponse.redirect(
        target.origin === request.nextUrl.origin ? target : new URL("/", request.url)
      );
      response.cookies.delete(AFTER_LOGIN_COOKIE);
      return response;
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

  // After a successful password reset we always show login (never bounce to the Arena).
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

    if (pathname === "/guest" && destination !== "/") {
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
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|auth/callback|auth/confirm|auth/sign-out|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)",
  ],
};
