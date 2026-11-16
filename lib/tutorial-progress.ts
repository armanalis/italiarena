/**
 * Which "How to play" windows this player has already seen or played through.
 * get_my_tutorials() and mark_tutorial_seen() work for guest accounts too.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TutorialGame } from "@/lib/tutorials";

/**
 * True when this game should not open by itself: it is in the list, or the
 * list could not be loaded (the button still opens the window).
 */
export async function tutorialSeen(supabase: SupabaseClient, game: TutorialGame): Promise<boolean> {
  const { data, error } = await supabase.rpc("get_my_tutorials");
  if (error || !Array.isArray(data)) return true;
  return data.some((item) => item === game);
}

export async function markTutorialSeen(supabase: SupabaseClient, game: TutorialGame): Promise<void> {
  await supabase.rpc("mark_tutorial_seen", { p_game: game });
}
