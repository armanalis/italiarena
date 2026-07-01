/** OAuth callback: exchanges provider codes or email token hashes for a session. */
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  getAuthConfirmErrorCode,
  resolveAuthConfirmDestination,
  resolveAuthNextPath,
  verifyEmailTokenHash,
} from "@/lib/auth-email-confirm";
import { getPostAuthPath } from "@/lib/auth";
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
  const tokenType = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorCode = requestUrl.searchParams.get("error_code");

  if (tokenHash && tokenType) {
    const destinationPath =
      resolveAuthConfirmDestination(tokenType, next, origin) ??
      (await getPostAuthPath());
    const successResponse = NextResponse.redirect(`${origin}${destinationPath}`);
    const supabase = createSupabaseRouteClient(request, successResponse);
    const { error } = await verifyEmailTokenHash(
      supabase,
      tokenHash,
      tokenType
    );

    if (error) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set(
        "error",
        getAuthConfirmErrorCode(error.message)
      );
      return NextResponse.redirect(loginUrl);
    }

    return successResponse;
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

  const destinationPath =
    resolveAuthNextPath(next, origin) ?? (await getPostAuthPath());
  const successResponse = NextResponse.redirect(`${origin}${destinationPath}`);
  const supabase = createSupabaseRouteClient(request, successResponse);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
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

  return successResponse;
}
