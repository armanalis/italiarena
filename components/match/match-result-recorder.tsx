"use client";

import { useEffect, useRef } from "react";
import { saveMatchResult } from "@/app/dashboard/settings/actions";
import { useGameStore } from "@/store/useGameStore";

const SAVE_ATTEMPTS = 3;

export function MatchResultRecorder() {
  const roundPhase = useGameStore((state) => state.roundPhase);
  const matchSaved = useGameStore((state) => state.matchSaved);
  const markMatchSaved = useGameStore((state) => state.markMatchSaved);
  const savingRef = useRef(false);

  useEffect(() => {
    if (roundPhase !== "match_finished" || matchSaved || savingRef.current) {
      return;
    }

    const state = useGameStore.getState();
    if (!state.gameSessionId || !state.localPlayerRole || !state.matchWinner) {
      return;
    }

    savingRef.current = true;

    const payload = {
      sessionId: state.gameSessionId,
      opponentDisplayName: state.opponent?.displayName ?? "Opponent",
      mistakes: state.roundReviews
        .filter((round) => !round.wasCorrect && !round.isTiebreaker)
        .map((round) => ({
          questionId: round.questionId,
          selectedAnswer: round.selectedAnswer,
        })),
    };

    // A dropped request (mobile network) must not lose the match: this
    // effect does not run again on its own. finalize_match_result is
    // idempotent, so a retry after a lost response is safe.
    void (async () => {
      try {
        for (let attempt = 1; attempt <= SAVE_ATTEMPTS; attempt += 1) {
          const response = await saveMatchResult(payload).catch(() => null);
          if (response?.success) {
            markMatchSaved();
            return;
          }
          if (attempt < SAVE_ATTEMPTS) {
            await new Promise((resolve) => window.setTimeout(resolve, 1_500 * attempt));
          }
        }
      } finally {
        savingRef.current = false;
      }
    })();
  }, [markMatchSaved, matchSaved, roundPhase]);

  return null;
}
