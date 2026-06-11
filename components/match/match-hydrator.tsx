/**
 * Syncs server-fetched match identity into the store.
 *
 * For REAL (PvP) matches this only sets identity fields (opponent, role flags).
 * All live round state (playlist, phase, index, scores) is owned exclusively by
 * `useServerMatchSync`, which treats the database as the single source of truth.
 * Touching round state here previously caused a race that clobbered the synced
 * "playing" phase and left the second player stuck on the topic screen.
 *
 * For BOT matches there is no server to sync against, so we set up the full
 * match locally via `startMatch`.
 */
"use client";

import { useEffect, useRef } from "react";
import { useGameStore, useGameStoreHydrated } from "@/store/useGameStore";
import type { QuestionActive } from "@/types/database.types";

type MatchHydratorProps = {
  sessionId: string;
  opponent: {
    id: string;
    isGhost: boolean;
    displayName: string;
  } | null;
  playlist: QuestionActive[];
};

export function MatchHydrator({
  sessionId,
  opponent,
  playlist,
}: MatchHydratorProps) {
  const hydrated = useGameStoreHydrated();
  const startMatch = useGameStore((state) => state.startMatch);
  const setupSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !opponent || playlist.length === 0) {
      return;
    }

    if (setupSessionRef.current === sessionId) {
      return;
    }
    setupSessionRef.current = sessionId;

    // Bot match: no server sync — set up the whole match locally.
    if (opponent.isGhost) {
      const state = useGameStore.getState();
      const alreadyRunningThisSession =
        state.gameSessionId === sessionId && state.playlist.length > 0;

      if (!alreadyRunningThisSession) {
        startMatch({
          gameSessionId: sessionId,
          opponent,
          playlist,
        });
      }
      return;
    }

    // PvP match: only set identity. useServerMatchSync owns round state.
    useGameStore.setState({
      gameSessionId: sessionId,
      opponent,
      isBotMatch: false,
      botDifficulty: null,
    });
  }, [hydrated, opponent, playlist, sessionId, startMatch]);

  return null;
}
