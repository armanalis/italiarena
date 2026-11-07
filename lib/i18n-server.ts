import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getAuthUserId } from "@/lib/auth";
import { isUiLanguage, translator, uiLanguageFromHeader, UI_LANGUAGE_COOKIE, type Dictionary, type UiLanguage } from "@/lib/i18n";
import { TR } from "@/lib/i18n-tr";
import { createClient } from "@/utils/supabase/server";

/**
 * The app language for this request: this device's choice (cookie), else the
 * account's (a new device), else the browser's. `fromCookie: false` tells the
 * page to keep it in the cookie, so the first language stays put.
 */
export const getUiLanguage = cache(async (): Promise<{ language: UiLanguage; fromCookie: boolean }> => {
  const chosen = (await cookies()).get(UI_LANGUAGE_COOKIE)?.value;
  if (isUiLanguage(chosen)) {
    return { language: chosen, fromCookie: true };
  }
  const userId = await getAuthUserId();
  if (userId) {
    // Its own query, not the profile's: before the ui_language migration it just finds nothing.
    const { data } = await (await createClient()).from("users").select("ui_language").eq("id", userId).maybeSingle();
    if (isUiLanguage(data?.ui_language)) {
      return { language: data.ui_language, fromCookie: false };
    }
  }
  return { language: uiLanguageFromHeader((await headers()).get("accept-language")), fromCookie: false };
});

/** The translations for `language`; null for English. */
export function dictionaryFor(language: UiLanguage): Dictionary | null {
  return language === "tr" ? TR : null;
}

/** Server components: const t = await getT(); t("Enter the Arena"). */
export async function getT() {
  return translator(dictionaryFor((await getUiLanguage()).language));
}
