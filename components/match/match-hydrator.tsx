/** Syncs server-fetched match data into the persisted Zustand store. */
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
  const syncedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !opponent || playlist.length === 0) {
      return;
    }

    const state = useGameStore.getState();

    if (
      state.gameSessionId === sessionId &&
      state.playlist.length > 0 &&
      syncedSessionRef.current === sessionId
    ) {
      return;
    }

    syncedSessionRef.current = sessionId;
    startMatch({
      gameSessionId: sessionId,
      opponent,
      playlist,
    });
  }, [hydrated, opponent, playlist, sessionId, startMatch]);

  return null;
}
