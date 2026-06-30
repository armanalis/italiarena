/** OAuth callback: exchanges the provider code for a Supabase session. */
import { NextResponse } from "next/server";
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
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorCode = requestUrl.searchParams.get("error_code");

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

  const supabase = await createClient();
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

  if (next) {
    const nextPath = next.startsWith("/") ? next : `/${next}`;
    return NextResponse.redirect(`${origin}${nextPath}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  const destination = await getPostAuthPath();
  return NextResponse.redirect(`${origin}${destination}`);
}
