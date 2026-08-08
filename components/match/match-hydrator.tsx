/**
 * Syncs server-fetched match identity into the store.
 *
 * For REAL (PvP) matches this only sets identity fields (opponent, role flags).
 * All live round state (playlist, phase, index, scores) is owned exclusively by
 * `useServerMatchSync`, which treats the database as the single source of truth.
 * Touching round state here previously caused a race that clobbered the synced
 * "playing" phase and left the second player stuck on the topic screen.
 *
 * For BOT matches there is no live PvP sync loop, so we set up the match
 * locally via `startMatch`, then rehydrate cumulative scores (and the next
 * question index) from `game_sessions.score_state` so a refresh cannot wipe
 * the point process. Mid-question bot answers are not persisted — a refresh
 * restarts the current unanswered question with a fresh timer (scores for
 * completed rounds still survive).
 */
"use client";

import { useEffect, useRef } from "react";
import { botDifficultyFromDisplayName } from "@/lib/bot";
import {
  isMatchScoreState,
  scoreStateToStorePatch,
} from "@/lib/match-score-state";
import { FRESH_ROUND_TIMER_STATE } from "@/lib/match-timer";
import { determineWinner } from "@/lib/scoring";
import { createClient } from "@/utils/supabase/client";
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

    // PvP match: only set identity. useServerMatchSync owns round state.
    if (!opponent.isGhost) {
      setupSessionRef.current = sessionId;
      useGameStore.setState({
        gameSessionId: sessionId,
        opponent,
        isBotMatch: false,
        botDifficulty: null,
      });
      return;
    }

    // Bot match: load score_state first, then apply one atomic store update so
    // the game loop never briefly starts round 0 before resuming mid-match.
    let cancelled = false;

    const setupBotMatch = async () => {
      const state = useGameStore.getState();
      const alreadyRunningThisSession =
        state.gameSessionId === sessionId &&
        state.playlist.length > 0 &&
        (state.roundPhase === "playing" ||
          state.roundPhase === "topic_reveal" ||
          state.roundPhase === "round_result" ||
          state.roundReviews.length > 0);

      if (alreadyRunningThisSession) {
        setupSessionRef.current = sessionId;
        return;
      }

      const preservedDifficulty =
        state.gameSessionId === sessionId ? state.botDifficulty : null;
      const botDifficulty =
        preservedDifficulty ??
        botDifficultyFromDisplayName(opponent.displayName);

      const supabase = createClient();
      const { data: session } = await supabase
        .from("game_sessions")
        .select("score_state")
        .eq("id", sessionId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      setupSessionRef.current = sessionId;

      const score = isMatchScoreState(session?.score_state)
        ? session.score_state
        : null;

      if (!score || score.resolvedThroughIndex < 0) {
        startMatch({
          gameSessionId: sessionId,
          opponent,
          playlist,
          botDifficulty,
        });
        return;
      }

      const patch = scoreStateToStorePatch(score);
      const nextIndex = score.resolvedThroughIndex + 1;
      const finished =
        score.matchFinished || nextIndex >= playlist.length;

      if (finished) {
        useGameStore.setState({
          gameSessionId: sessionId,
          opponent,
          playlist,
          isBotMatch: true,
          botDifficulty,
          ...patch,
          status: "finished",
          roundPhase: "match_finished",
          matchWinner: determineWinner(
            score.playerAScore,
            score.playerBScore,
            score.playerAResponseTimes,
            score.playerBResponseTimes
          ),
          currentQuestionIndex: Math.max(0, score.resolvedThroughIndex),
          playerAAnswer: null,
          playerBAnswer: null,
          roundStartedAt: null,
          ...FRESH_ROUND_TIMER_STATE,
          matchSaved: false,
          tiebreakerQuestion: null,
        });
        return;
      }

      useGameStore.setState({
        gameSessionId: sessionId,
        status: "playing",
        opponent,
        playlist,
        isBotMatch: true,
        botDifficulty,
        ...patch,
        currentQuestionIndex: nextIndex,
        roundPhase: "topic_reveal",
        playerAAnswer: null,
        playerBAnswer: null,
        roundStartedAt: null,
        ...FRESH_ROUND_TIMER_STATE,
        matchWinner: null,
        matchSaved: false,
        tiebreakerQuestion: null,
      });
    };

    void setupBotMatch();

    return () => {
      cancelled = true;
    };
  }, [hydrated, opponent, playlist, sessionId, startMatch]);

  return null;
}
