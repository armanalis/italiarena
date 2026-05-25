/** Client-side matchmaking lobby with presence, polling, and ghost fallback. */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ghost, Loader2, Users } from "lucide-react";
import {
  searchForMatch,
  startGhostMatch,
} from "@/app/dashboard/matchmaking/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { useGameStore } from "@/store/useGameStore";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEARCH_INTERVAL_MS = 3000;
const GHOST_COUNTDOWN_SECONDS = 15;

type MatchmakingLobbyProps = {
  profile: UserProfile;
  mode: "real" | "bot";
};

type PresencePlayer = {
  id: string;
  target_language: string;
  proficiency_level: string;
};

export function MatchmakingLobby({ profile, mode }: MatchmakingLobbyProps) {
  const router = useRouter();
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const redirectingRef = useRef(false);

  const gameSessionId = useGameStore((state) => state.gameSessionId);
  const setSearching = useGameStore((state) => state.setSearching);
  const setSessionId = useGameStore((state) => state.setSessionId);
  const startMatch = useGameStore((state) => state.startMatch);
  const reset = useGameStore((state) => state.reset);

  const [secondsLeft, setSecondsLeft] = useState(GHOST_COUNTDOWN_SECONDS);
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    mode === "bot" ? "Summoning ghost opponent..." : "Searching for opponent..."
  );

  const language = profile.target_language!;
  const level = profile.proficiency_level!;
  const isBotMode = mode === "bot";

  const goToMatch = useCallback(
    (sessionId: string) => {
      if (redirectingRef.current) {
        return;
      }

      redirectingRef.current = true;
      router.push(`/dashboard/match/${sessionId}`);
    },
    [router]
  );

  const handleActiveMatch = useCallback(
    (sessionId: string, playlist: Parameters<typeof startMatch>[0]["playlist"], opponent: NonNullable<Parameters<typeof startMatch>[0]["opponent"]>) => {
      startMatch({ gameSessionId: sessionId, opponent, playlist });
      setStatusMessage(
        opponent.isGhost
          ? "Ghost opponent ready — starting match..."
          : "Opponent found — starting match..."
      );
      goToMatch(sessionId);
    },
    [goToMatch, startMatch]
  );

  const runSearch = useCallback(async () => {
    const result = await searchForMatch(gameSessionId);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setError(null);
    setSessionId(result.data.sessionId);

    if (result.data.status === "active" && result.data.opponent) {
      handleActiveMatch(
        result.data.sessionId,
        result.data.playlist,
        result.data.opponent
      );
    }
  }, [gameSessionId, handleActiveMatch, setSessionId]);

  useEffect(() => {
    setSearching();
  }, [setSearching]);

  useEffect(() => {
    if (isBotMode) {
      return;
    }

    runSearch();

    const searchInterval = window.setInterval(runSearch, SEARCH_INTERVAL_MS);

    return () => window.clearInterval(searchInterval);
  }, [isBotMode, runSearch]);

  useEffect(() => {
    if (isBotMode) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isBotMode]);

  useEffect(() => {
    if (!isBotMode || gameSessionId) {
      return;
    }

    let cancelled = false;

    async function startInstantGhostMatch() {
      const searchResult = await searchForMatch(null);
      if (cancelled || !searchResult.success) {
        if (!cancelled && !searchResult.success) {
          setError(searchResult.error);
        }
        return;
      }

      setSessionId(searchResult.data.sessionId);

      if (searchResult.data.status === "active" && searchResult.data.opponent) {
        handleActiveMatch(
          searchResult.data.sessionId,
          searchResult.data.playlist,
          searchResult.data.opponent
        );
        return;
      }

      const ghostResult = await startGhostMatch(searchResult.data.sessionId);
      if (cancelled) {
        return;
      }

      if (!ghostResult.success) {
        setError(ghostResult.error);
        return;
      }

      if (ghostResult.data.status === "active" && ghostResult.data.opponent) {
        handleActiveMatch(
          ghostResult.data.sessionId,
          ghostResult.data.playlist,
          ghostResult.data.opponent
        );
      }
    }

    startInstantGhostMatch();

    return () => {
      cancelled = true;
    };
  }, [gameSessionId, handleActiveMatch, isBotMode, setSessionId]);

  useEffect(() => {
    if (isBotMode) {
      return;
    }

    if (secondsLeft !== 0 || !gameSessionId) {
      return;
    }

    let cancelled = false;

    async function triggerGhostMatch() {
      setStatusMessage("No opponent found — summoning ghost opponent...");
      const result = await startGhostMatch(gameSessionId!);

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data.status === "active" && result.data.opponent) {
        handleActiveMatch(
          result.data.sessionId,
          result.data.playlist,
          result.data.opponent
        );
      }
    }

    triggerGhostMatch();

    return () => {
      cancelled = true;
    };
  }, [gameSessionId, handleActiveMatch, isBotMode, secondsLeft]);

  useEffect(() => {
    if (!gameSessionId) {
      return;
    }

    const sessionChannel = supabase
      .channel(`game-session-${gameSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${gameSessionId}`,
        },
        async (payload) => {
          const updated = payload.new as {
            id: string;
            status: string;
            player_b_id: string | null;
          };

          if (updated.status !== "active") {
            return;
          }

          const result = await searchForMatch(updated.id);
          if (result.success && result.data.status === "active" && result.data.opponent) {
            handleActiveMatch(
              result.data.sessionId,
              result.data.playlist,
              result.data.opponent
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [gameSessionId, handleActiveMatch, supabase]);

  useEffect(() => {
    const channel = supabase.channel("waiting_room", {
      config: { presence: { key: profile.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePlayer>();
        const players = Object.values(state).flat();
        const relevant = players.filter(
          (player) =>
            player.target_language === language &&
            player.proficiency_level === level
        );
        setOnlineCount(relevant.length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: profile.id,
            target_language: language,
            proficiency_level: level,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [language, level, profile.id, supabase]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 touch-scroll sm:px-6 sm:py-12">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-card/60 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_60%)]" />

        <div className="relative space-y-6 text-center sm:space-y-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10 sm:size-20">
            <Loader2 className="size-8 animate-spin text-indigo-400 sm:size-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{statusMessage}</h1>
            <p className="text-sm text-muted-foreground">
              Matching {language} players at level {level}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Users className="size-3.5" />
              {onlineCount} online in your bracket
            </Badge>
            {gameSessionId && (
              <Badge variant="outline" className="font-mono text-xs">
                Lobby {gameSessionId.slice(0, 8)}
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            {!isBotMode && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Ghost className="size-4" />
                    Ghost match in
                  </span>
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold tabular-nums",
                      secondsLeft <= 5 ? "text-amber-400" : "text-foreground"
                    )}
                  >
                    {secondsLeft}s
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000 ease-linear"
                    style={{
                      width: `${((GHOST_COUNTDOWN_SECONDS - secondsLeft) / GHOST_COUNTDOWN_SECONDS) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  If no real player joins within 15 seconds, a ghost opponent takes
                  their place.
                </p>
              </>
            )}
            {isBotMode && (
              <p className="text-xs text-muted-foreground">
                Starting a ghost match immediately — no waiting room.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => {
              reset();
              router.push("/dashboard");
            }}
          >
            Cancel search
          </Button>
        </div>
      </div>
    </main>
  );
}
