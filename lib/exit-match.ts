import { navigateTo } from "@/lib/client-navigation";
import { useGameStore } from "@/store/useGameStore";
import { createClient } from "@/utils/supabase/client";

/** Routes where an in-progress match should be abandoned on dashboard exit. */
export function isImmersiveMatchRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard/match/") ||
    pathname === "/dashboard/matchmaking"
  );
}

function abandonSessionInBackground(sessionId: string, pathname: string) {
  const supabase = createClient();

  if (pathname.startsWith("/dashboard/match/")) {
    void supabase
      .from("game_sessions")
      .update({ status: "abandoned" })
      .eq("id", sessionId)
      .eq("status", "active");
    return;
  }

  if (pathname === "/dashboard/matchmaking") {
    void supabase
      .from("game_sessions")
      .update({ status: "abandoned" })
      .eq("id", sessionId)
      .eq("status", "waiting");
  }
}

/**
 * Leave the current match/matchmaking flow and go to the dashboard.
 * Uses a full page navigation so timers, sync loops, and client state cannot
 * block or cancel the transition.
 *
 * Finished matches are never abandoned — players may still be on the review
 * screen (or returning later). Only active / waiting sessions are closed.
 */
export function exitToDashboard() {
  const state = useGameStore.getState();
  const sessionId = state.gameSessionId;
  const pathname = window.location.pathname;
  const matchStillLive =
    state.roundPhase !== "match_finished" &&
    state.status !== "finished" &&
    state.matchWinner === null;

  useGameStore.getState().reset();

  if (sessionId && matchStillLive) {
    abandonSessionInBackground(sessionId, pathname);
  }

  navigateTo("/dashboard");
}
