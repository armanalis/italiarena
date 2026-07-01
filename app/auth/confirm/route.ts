/** Email confirmation and password recovery: exchanges token_hash for a session. */
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getAuthConfirmErrorCode,
  resolveAuthNextPath,
  verifyEmailTokenHash,
} from "@/lib/auth-email-confirm";
import { getPostAuthPath } from "@/lib/auth";
import {
  getProductionSiteUrl,
  getRequestOrigin,
  isLegacySiteHostname,
} from "@/lib/site-url";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (isLegacySiteHostname(requestUrl.hostname)) {
    const destination = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      getProductionSiteUrl()
    );
    return NextResponse.redirect(destination, 308);
  }

  const origin = getRequestOrigin(request);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextParam = requestUrl.searchParams.get("next");

  if (!tokenHash || !type) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth_confirm_failed");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error } = await verifyEmailTokenHash(supabase, tokenHash, type);

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", getAuthConfirmErrorCode(error.message));
    return NextResponse.redirect(loginUrl);
  }

  const nextPath = resolveAuthNextPath(nextParam, origin);
  if (nextPath) {
    return NextResponse.redirect(`${origin}${nextPath}`);
  }

  const destination = await getPostAuthPath();
  return NextResponse.redirect(`${origin}${destination}`);
}
