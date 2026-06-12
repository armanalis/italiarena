import {
  abandonActiveMatch,
  cancelMatchSearch,
} from "@/app/dashboard/matchmaking/actions";
import { navigateTo } from "@/lib/client-navigation";
import { useGameStore } from "@/store/useGameStore";

/** Routes where an in-progress match should be abandoned on dashboard exit. */
export function isImmersiveMatchRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard/match/") ||
    pathname === "/dashboard/matchmaking"
  );
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
    if (pathname.startsWith("/dashboard/match/")) {
      void abandonActiveMatch(sessionId);
    } else if (pathname === "/dashboard/matchmaking") {
      void cancelMatchSearch(sessionId);
    }
  }

  navigateTo("/dashboard");
}
