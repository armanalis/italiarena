import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/** Supabase client for route handlers; writes session cookies onto the given response. */
export function createSupabaseRouteClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

/** Expires every Supabase auth cookie of the request on the response. */
export function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
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
