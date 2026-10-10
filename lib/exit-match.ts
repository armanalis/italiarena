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

async function abandonSession(sessionId: string, pathname: string) {
  const fromStatus = pathname.startsWith("/dashboard/match/")
    ? "active"
    : pathname === "/dashboard/matchmaking"
      ? "waiting"
      : null;

  if (!fromStatus) {
    return;
  }

  // Must be awaited: a Supabase query only sends its request when awaited,
  // and the page unloads right after this.
  await createClient()
    .from("game_sessions")
    .update({ status: "abandoned" })
    .eq("id", sessionId)
    .eq("status", fromStatus);
}

function isMatchStillLive(state: ReturnType<typeof useGameStore.getState>) {
  return (
    state.roundPhase !== "match_finished" &&
    state.status !== "finished" &&
    state.matchWinner === null
  );
}

/**
 * Leaving now is a forfeit: a live PvP match with a scored round. The
 * server then records a loss for the leaver and a win for the opponent
 * (supabase/pvp-forfeit-2026-10-09.sql).
 */
export function exitCountsAsLoss() {
  const state = useGameStore.getState();
  return (
    Boolean(state.gameSessionId) &&
    !state.isBotMatch &&
    window.location.pathname.startsWith("/dashboard/match/") &&
    isMatchStillLive(state) &&
    state.roundReviews.length > 0
  );
}

/**
 * Leave the current match/matchmaking flow and go to the dashboard.
 * Uses a full page navigation so timers, sync loops, and client state cannot
 * block or cancel the transition.
 *
 * Finished matches are never abandoned — players may still be on the review
 * screen (or returning later). Only active / waiting sessions are closed.
 */
export async function exitToDashboard() {
  const state = useGameStore.getState();
  const sessionId = state.gameSessionId;
  const pathname = window.location.pathname;

  try {
    if (sessionId && isMatchStillLive(state)) {
      await abandonSession(sessionId, pathname);
    }
  } finally {
    useGameStore.getState().reset();
    navigateTo("/dashboard");
  }
}
