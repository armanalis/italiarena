import "server-only";
import { createAdminClientOrNull } from "@/utils/supabase/admin";

/**
 * Whether this language has any preposition cards. Home and the menu stay
 * hidden until it does: starting a Sprint just to look would begin the clock.
 */
export async function hasPrepositionCards(language: string): Promise<boolean> {
  const admin = createAdminClientOrNull();
  if (!admin) return false;
  const { count, error } = await admin
    .from("article_nouns")
    .select("id", { count: "exact", head: true })
    .eq("language", language)
    .eq("kind", "preposition");
  return !error && (count ?? 0) > 0;
}
