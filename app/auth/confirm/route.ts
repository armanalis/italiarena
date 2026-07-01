/** Email confirmation and password recovery: exchanges token_hash for a session. */
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  AUTH_CONFIRM_FINALIZE_PARAM,
  buildAuthConfirmPendingPath,
  getAuthConfirmErrorCode,
  resolveAuthConfirmDestination,
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
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextParam = requestUrl.searchParams.get("next");

  if (!tokenHash || !type) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth_confirm_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (requestUrl.searchParams.get(AUTH_CONFIRM_FINALIZE_PARAM) !== "1") {
    const pendingPath = buildAuthConfirmPendingPath({
      tokenHash,
      type,
      next: nextParam,
    });
    return NextResponse.redirect(new URL(pendingPath, origin));
  }

  const destinationPath =
    resolveAuthConfirmDestination(type, nextParam, origin) ??
    (await getPostAuthPath());
  const successResponse = NextResponse.redirect(`${origin}${destinationPath}`);
  const supabase = createSupabaseRouteClient(request, successResponse);
  const { error } = await verifyEmailTokenHash(supabase, tokenHash, type);

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      type === "recovery"
        ? "reset_link_expired"
        : getAuthConfirmErrorCode(error.message)
    );
    return NextResponse.redirect(loginUrl);
  }

  return successResponse;
}
