/**
 * Route protection for authenticated pages.
 * Keeps /dashboard and /onboarding behind login, and bounces signed-in users away from /login.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

const protectedRoutes = ["/dashboard", "/onboarding", "/admin"];

async function getPostAuthPathFromRequest(
  supabase: SupabaseClient,
  userId: string
): Promise<"/dashboard" | "/onboarding"> {
  const { data } = await supabase
    .from("users")
    .select("target_language, proficiency_level")
    .eq("id", userId)
    .maybeSingle();

  if (data?.target_language && data?.proficiency_level) {
    return "/dashboard";
  }

  return "/onboarding";
}

export async function middleware(request: NextRequest) {
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

  if ((pathname === "/login" || pathname === "/guest") && user) {
    const destination = await getPostAuthPathFromRequest(supabase, user.id);
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = destination;
    return NextResponse.redirect(nextUrl);
  }

  if (pathname.startsWith("/login/reset-password") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "reset_link_expired");
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
