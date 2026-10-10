/** OAuth callback: exchanges a provider code for a session. */
import { type NextRequest, NextResponse } from "next/server";
import { resolveAuthNextPath } from "@/lib/auth-email-confirm";
import { getPostAuthPathForUser } from "@/lib/auth";
import {
  getProductionSiteUrl,
  isLegacySiteHostname,
} from "@/lib/site-url";
import { createSupabaseRouteClient } from "@/utils/supabase/route-handler";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;

  if (isLegacySiteHostname(requestUrl.hostname)) {
    const destination = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      getProductionSiteUrl()
    );
    return NextResponse.redirect(destination, 308);
  }

  const origin = requestUrl.origin;
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const tokenType = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorCode = requestUrl.searchParams.get("error_code");

  // Email links (token_hash) are verified by /auth/confirm; this keeps older
  // links that point here working.
  if (tokenHash && tokenType) {
    return NextResponse.redirect(
      new URL(`/auth/confirm${requestUrl.search}`, origin)
    );
  }

  if (oauthError) {
    const loginUrl = new URL("/login", origin);
    if (oauthErrorCode === "flow_state_already_used") {
      loginUrl.searchParams.set("error", "auth_session_expired");
    } else {
      loginUrl.searchParams.set("error", "auth_callback_failed");
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  const explicitNextPath = resolveAuthNextPath(next, origin);
  const successResponse = NextResponse.redirect(
    `${origin}${explicitNextPath ?? "/onboarding"}`
  );
  const supabase = createSupabaseRouteClient(request, successResponse);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (explicitNextPath === "/login/reset-password") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        successResponse.headers.set(
          "Location",
          `${origin}/login/reset-password`
        );
        return successResponse;
      }

      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "reset_link_expired");
      return NextResponse.redirect(loginUrl);
    }

    const loginUrl = new URL("/login", origin);
    if (error.message.toLowerCase().includes("already been used")) {
      loginUrl.searchParams.set("error", "auth_session_expired");
    } else {
      loginUrl.searchParams.set("error", "auth_callback_failed");
    }
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  const resetPasswordPath = resolveAuthNextPath(next, origin);
  if (resetPasswordPath === "/login/reset-password") {
    successResponse.headers.set("Location", `${origin}/login/reset-password`);
    return successResponse;
  }

  if (!explicitNextPath) {
    const destinationPath = await getPostAuthPathForUser(supabase, user);
    successResponse.headers.set("Location", `${origin}${destinationPath}`);
  }

  return successResponse;
}
