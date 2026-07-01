/** OAuth callback: exchanges provider codes or email token hashes for a session. */
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  AUTH_CONFIRM_FINALIZE_PARAM,
  buildAuthConfirmPendingPath,
  getAuthConfirmErrorCode,
  resolveAuthConfirmDestination,
  resolveAuthNextPath,
  verifyEmailTokenHash,
} from "@/lib/auth-email-confirm";
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
  const tokenType = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorCode = requestUrl.searchParams.get("error_code");

  if (tokenHash && tokenType) {
    if (requestUrl.searchParams.get(AUTH_CONFIRM_FINALIZE_PARAM) !== "1") {
      const pendingPath = buildAuthConfirmPendingPath({
        tokenHash,
        type: tokenType,
        next,
      });
      return NextResponse.redirect(new URL(pendingPath, origin));
    }

    const explicitDestination =
      resolveAuthConfirmDestination(tokenType, next, origin);
    const successResponse = NextResponse.redirect(
      `${origin}${explicitDestination ?? "/onboarding"}`
    );
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
        tokenType === "recovery"
          ? "reset_link_expired"
          : getAuthConfirmErrorCode(error.message)
      );
      return NextResponse.redirect(loginUrl);
    }

    if (!explicitDestination) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const destinationPath = await getPostAuthPathForUser(supabase, user);
        successResponse.headers.set("Location", `${origin}${destinationPath}`);
      }
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

  const explicitNextPath = resolveAuthNextPath(next, origin);
  const successResponse = NextResponse.redirect(
    `${origin}${explicitNextPath ?? "/onboarding"}`
  );
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

  if (!explicitNextPath) {
    const destinationPath = await getPostAuthPathForUser(supabase, user);
    successResponse.headers.set("Location", `${origin}${destinationPath}`);
  }

  return successResponse;
}
