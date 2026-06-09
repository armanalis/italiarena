"use client";

import { useEffect, useRef } from "react";
import { saveMatchResult } from "@/app/dashboard/settings/actions";
import { useGameStore } from "@/store/useGameStore";
import type { TargetLanguage, ProficiencyLevel } from "@/lib/constants";

type MatchResultRecorderProps = {
  language: TargetLanguage;
  level: ProficiencyLevel;
};

export function MatchResultRecorder({ language, level }: MatchResultRecorderProps) {
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

    const localScore =
      state.localPlayerRole === "a" ? state.playerAScore : state.playerBScore;
    const opponentScore =
      state.localPlayerRole === "a" ? state.playerBScore : state.playerAScore;

    const result =
      state.matchWinner === "tie"
        ? "tie"
        : state.matchWinner === state.localPlayerRole
          ? "win"
          : "loss";

    void saveMatchResult({
      sessionId: state.gameSessionId,
      userScore: localScore,
      opponentScore,
      result,
      opponentType: state.isBotMatch ? "ghost" : "real",
      opponentDisplayName: state.opponent?.displayName ?? "Opponent",
      language,
      level,
      categoryProgress: state.categoryProgress,
      questionIds: state.playlist.map((question) => question.id),
    }).then((response) => {
      if (response.success) {
        markMatchSaved();
      }
      savingRef.current = false;
    });
  }, [language, level, markMatchSaved, matchSaved, roundPhase]);

  return null;
}
