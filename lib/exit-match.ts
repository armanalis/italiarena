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
 */
export function exitToDashboard() {
  const sessionId = useGameStore.getState().gameSessionId;
  const pathname = window.location.pathname;

  useGameStore.getState().reset();

  if (sessionId) {
    abandonSessionInBackground(sessionId, pathname);
  }

  navigateTo("/dashboard");
}
