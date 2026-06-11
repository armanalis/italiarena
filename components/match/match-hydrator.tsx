/** Syncs server-fetched match data into the persisted Zustand store. */
"use client";

import { useEffect, useRef } from "react";
import { playlistIdsSignature } from "@/lib/match-sync";
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

    // Lobby may have already called startMatch before navigation. Never restart
    // the same session — that wipes roundReviews, scores, and match progress.
    if (state.gameSessionId === sessionId) {
      syncedSessionRef.current = sessionId;

      const opponentChanged =
        state.opponent?.id !== opponent.id ||
        state.opponent?.isGhost !== opponent.isGhost ||
        state.opponent?.displayName !== opponent.displayName;

      if (opponentChanged) {
        useGameStore.setState({
          opponent,
          isBotMatch: opponent.isGhost,
          botDifficulty: opponent.isGhost ? state.botDifficulty ?? "medium" : null,
        });
      }

      const serverPlaylistSig = playlistIdsSignature(playlist);
      const localPlaylistSig = playlistIdsSignature(state.playlist);

      if (
        playlist.length > 0 &&
        (state.playlist.length === 0 || serverPlaylistSig !== localPlaylistSig)
      ) {
        useGameStore.setState({
          playlist,
          currentQuestionIndex: 0,
          roundPhase: "topic_reveal",
          playerAAnswer: null,
          playerBAnswer: null,
          roundStartedAt: null,
          timeRemaining: 25,
          playerAScore: 0,
          playerBScore: 0,
          lastRoundPointsA: 0,
          lastRoundPointsB: 0,
          matchWinner: null,
          tiebreakerUsed: false,
          tiebreakerQuestion: null,
        });
      }
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
