/** Clears the auth session on the redirect response, then sends the user to a safe path. */
import { type NextRequest, NextResponse } from "next/server";
import { resolveAuthNextPath } from "@/lib/auth-email-confirm";
import {
  getProductionSiteUrl,
  isLegacySiteHostname,
} from "@/lib/site-url";
import { createSupabaseRouteClient } from "@/utils/supabase/route-handler";

function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith("sb-") ||
      cookie.name.includes("auth-token") ||
      cookie.name.includes("code-verifier")
    ) {
      response.cookies.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
      });
    }
  }
}

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
