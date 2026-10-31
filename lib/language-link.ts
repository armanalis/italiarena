/** /german and /italian: open the site in that language, for links people share. */
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { dashboardTag } from "@/lib/dashboard-cache";
import {
  isTargetLanguage,
  LANGUAGE_META,
  type ProficiencyLevel,
  type TargetLanguage,
} from "@/lib/constants";
import { createClient } from "@/utils/supabase/server";

const LANGUAGE_COOKIE = "preferred_language";

/** The language of the last /german or /italian link: sign-up and guest setup preselect it. */
export async function linkedLanguage(): Promise<TargetLanguage | null> {
  const value = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return isTargetLanguage(value) ? value : null;
}

/**
 * Signed-in players switch to `language` at the level they last used in it;
 * with none yet, the header switcher opens to ask (?lang=de). Visitors land
 * on the home page, and sign-up starts with the language chosen.
 */
export async function openLanguage(request: NextRequest, language: TargetLanguage) {
  const home = new URL("/", request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("users")
      .select("target_language, language_levels")
      .eq("id", user.id)
      .maybeSingle();
    const level = (data?.language_levels as Partial<Record<TargetLanguage, ProficiencyLevel>> | null)?.[language];

    if (data?.target_language && data.target_language !== language) {
      if (level) {
        await supabase
          .from("users")
          .update({ target_language: language, proficiency_level: level })
          .eq("id", user.id);
        revalidateTag(dashboardTag(user.id, "settings"), { expire: 0 });
        revalidateTag(dashboardTag(user.id, "statistics"), { expire: 0 });
      } else {
        home.searchParams.set("lang", LANGUAGE_META[language].code);
      }
    }
  }

  const response = NextResponse.redirect(home);
  response.cookies.set(LANGUAGE_COOKIE, language, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
