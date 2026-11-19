/** Clears the auth session on the redirect response, then sends the user to a safe path. */
import { type NextRequest, NextResponse } from "next/server";
import { resolveAuthNextPath } from "@/lib/auth-email-confirm";
import { clearSupabaseCookies, createSupabaseRouteClient } from "@/utils/supabase/route-handler";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;

  // Link/browser prefetches also hit this GET. Signing out on one would end the
  // session (globally) the moment a sign-out link scrolls into view.
  if (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("sec-purpose")?.includes("prefetch") ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return new NextResponse(null, { status: 204 });
  }

  const origin = requestUrl.origin;
  const nextParam = requestUrl.searchParams.get("next");
  const nextPath =
    resolveAuthNextPath(nextParam, origin) ?? "/login";

  const response = NextResponse.redirect(new URL(nextPath, origin));
  const supabase = createSupabaseRouteClient(request, response);

  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // Still clear cookies below even if the Auth API call fails.
  }

  clearSupabaseCookies(request, response);
  return response;
}
