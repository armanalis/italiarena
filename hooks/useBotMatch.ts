"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBotResponseDelayMs, getBotResponseTimeMs } from "@/lib/bot";
import { shouldStartTiebreaker } from "@/lib/match";
import { buildMatchScoreState } from "@/lib/match-score-state";
import {
  persistBotMatchScoreState,
  requestTiebreakerQuestion,
} from "@/lib/match-sync-client";
import { FRESH_ROUND_TIMER_STATE } from "@/lib/match-timer";
import { TOPIC_REVEAL_MS } from "@/lib/match-timing";
import type { GameSound } from "@/hooks/useGameAudio";
import { useGameStore } from "@/store/useGameStore";
import type { PublicQuestion } from "@/types/database.types";

type UseBotMatchOptions = {
  /** False in a real match: nothing here runs (like useServerMatchSync in a bot match). */
  enabled: boolean;
  sessionId: string;
  supabase: SupabaseClient;
  localPlayerRole: "a" | "b";
  serverPlaylist: PublicQuestion[];
  play: (sound: GameSound) => void;
  // The round loop's own pieces (useGameLoop).
  startRoundTimer: () => void;
  clearRoundTimer: () => void;
  /** Every timer of the round, the bot's included. */
  clearTimers: () => void;
  finalizeRoundRef: RefObject<() => void>;
  resolvingRef: RefObject<boolean>;
};

/**
 * A match against a bot: this browser runs the rounds by itself. It starts
 * each question, lets the bot "answer", saves the scores and moves on, where
 * a real match waits for the host's server rounds (useServerMatchSync).
 */
export function useBotMatch({
  enabled,
  sessionId,
  supabase,
  localPlayerRole,
  serverPlaylist,
  play,
  startRoundTimer,
  clearRoundTimer,
  clearTimers,
  finalizeRoundRef,
  resolvingRef,
}: UseBotMatchOptions) {
  const roundPhase = useGameStore((state) => state.roundPhase);
  const currentQuestionIndex = useGameStore((state) => state.currentQuestionIndex);
  const roundStartedAt = useGameStore((state) => state.roundStartedAt);

  const beginRound = useGameStore((state) => state.beginRound);
  const lockOpponentAnswer = useGameStore((state) => state.lockOpponentAnswer);
  const advanceToNextRound = useGameStore((state) => state.advanceToNextRound);
  const startTiebreakerRound = useGameStore((state) => state.startTiebreakerRound);
  const setRoundPhase = useGameStore((state) => state.setRoundPhase);

  const topicTimerRef = useRef<number | null>(null);
  const botTimerRef = useRef<number | null>(null);

  const clearTopicTimer = useCallback(() => {
    if (topicTimerRef.current) {
      window.clearTimeout(topicTimerRef.current);
      topicTimerRef.current = null;
    }
  }, []);

  const clearBotTimer = useCallback(() => {
    if (botTimerRef.current) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  const clearBotTimers = useCallback(() => {
    clearTopicTimer();
    clearBotTimer();
  }, [clearBotTimer, clearTopicTimer]);

  /**
   * Push cumulative scores to the session row so a refresh cannot wipe them.
   * Bot matches only — PvP scoring is server-resolved from locked answers
   * (see resolveMatchRoundServer in useServerMatchSync), and the database no
   * longer accepts a client-written score_state for a real opponent.
   */
  const persistScores = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const state = useGameStore.getState();
    if (!state.gameSessionId) {
      return;
    }

    const result = await persistBotMatchScoreState(
      supabase,
      state.gameSessionId,
      buildMatchScoreState(state)
    );

    if (!result.success) {
      console.error(`[match-sync] score persist failed: ${result.error}`);
    }
  }, [enabled, supabase]);

  const scheduleBotAnswer = useCallback(() => {
    if (!enabled || botTimerRef.current) {
      return;
    }

    const state = useGameStore.getState();
    const question = state.playlist[state.currentQuestionIndex];
    const startedAt = state.roundStartedAt;

    if (!question || !startedAt) {
      return;
    }

    const botRole = localPlayerRole === "a" ? "b" : "a";
    const botAlreadyAnswered =
      botRole === "a" ? state.playerAAnswer : state.playerBAnswer;

    if (botAlreadyAnswered) {
      return;
    }

    const botDifficulty = state.botDifficulty ?? "medium";
    const delay = getBotResponseDelayMs(startedAt, botDifficulty);
    const questionIndex = state.currentQuestionIndex;

    botTimerRef.current = window.setTimeout(() => {
      botTimerRef.current = null;

      const latest = useGameStore.getState();
      if (latest.currentQuestionIndex !== questionIndex) {
        return;
      }

      const latestBotAnswer =
        botRole === "a" ? latest.playerAAnswer : latest.playerBAnswer;

      if (
        latestBotAnswer ||
        latest.roundPhase === "round_result" ||
        latest.roundPhase === "match_finished"
      ) {
        return;
      }

      // The bot "locks in" at its usual time, but its pick stays hidden:
      // the browser has no answer to choose from. reveal_round_answer
      // decides the pick on the server and finalizeRound fills it in.
      const responseTimeMs = getBotResponseTimeMs(latest.botDifficulty ?? "medium");
      lockOpponentAnswer(null, responseTimeMs);

      const locked = useGameStore.getState();
      if (locked.playerAAnswer && locked.playerBAnswer) {
        finalizeRoundRef.current();
      }
    }, delay);
  }, [enabled, finalizeRoundRef, localPlayerRole, lockOpponentAnswer]);

  /** The question clock ran out: a bot that has not answered timed out. */
  const roundTimeUp = useCallback(() => {
    if (!enabled) {
      return;
    }

    const state = useGameStore.getState();
    const botAnswer =
      state.localPlayerRole === "a" ? state.playerBAnswer : state.playerAAnswer;
    if (!botAnswer) {
      lockOpponentAnswer(null, null);
    }
  }, [enabled, lockOpponentAnswer]);

  const beginRoundPlaying = useCallback(
    (questionIndex: number, startedAt: number) => {
      if (useGameStore.getState().currentQuestionIndex !== questionIndex) {
        useGameStore.setState({ currentQuestionIndex: questionIndex });
      }

      beginRound(startedAt);
      scheduleBotAnswer();
      startRoundTimer();
    },
    [beginRound, scheduleBotAnswer, startRoundTimer]
  );

  const startTopicReveal = useCallback(
    (questionIndex: number) => {
      clearRoundTimer();
      clearTopicTimer();
      resolvingRef.current = false;

      useGameStore.setState({
        currentQuestionIndex: questionIndex,
        roundPhase: "topic_reveal",
        playerAAnswer: null,
        playerBAnswer: null,
        roundStartedAt: null,
        ...FRESH_ROUND_TIMER_STATE,
        lastRoundPointsA: 0,
        lastRoundPointsB: 0,
      });

      play("reveal");

      topicTimerRef.current = window.setTimeout(() => {
        beginRoundPlaying(questionIndex, Date.now());
      }, TOPIC_REVEAL_MS);
    },
    [beginRoundPlaying, clearRoundTimer, clearTopicTimer, play, resolvingRef]
  );

  /** The result screen is over: sudden death, the next question, or the end. */
  const advanceAfterResult = useCallback(async () => {
    const latest = useGameStore.getState();
    if (latest.roundPhase !== "round_result") {
      return;
    }

    if (shouldStartTiebreaker(latest)) {
      setRoundPhase("tiebreaker_loading");

      const tiebreaker = await requestTiebreakerQuestion(supabase, sessionId);
      if (tiebreaker) {
        startTiebreakerRound(tiebreaker);
        void persistScores();
        return;
      }
    }

    advanceToNextRound();
    const afterAdvance = useGameStore.getState();
    void persistScores();
    if (afterAdvance.roundPhase === "match_finished") {
      return;
    }
    startTopicReveal(afterAdvance.currentQuestionIndex);
  }, [
    advanceToNextRound,
    persistScores,
    sessionId,
    setRoundPhase,
    startTiebreakerRound,
    startTopicReveal,
    supabase,
  ]);

  useEffect(() => {
    if (enabled && serverPlaylist.length > 0) {
      useGameStore.setState({ playlist: serverPlaylist });
    }
  }, [enabled, serverPlaylist]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (
      roundPhase === "round_result" ||
      roundPhase === "match_finished" ||
      roundPhase === "tiebreaker_loading"
    ) {
      return;
    }

    clearTimers();
    resolvingRef.current = false;

    if (roundPhase === "topic_reveal") {
      play("reveal");
      topicTimerRef.current = window.setTimeout(() => {
        beginRoundPlaying(currentQuestionIndex, Date.now());
      }, TOPIC_REVEAL_MS);
    }

    if (roundPhase === "playing" && roundStartedAt) {
      scheduleBotAnswer();
      startRoundTimer();
    }

    return () => {
      clearRoundTimer();
      clearTopicTimer();
    };
  }, [
    beginRoundPlaying,
    clearRoundTimer,
    clearTimers,
    clearTopicTimer,
    currentQuestionIndex,
    enabled,
    play,
    resolvingRef,
    roundPhase,
    roundStartedAt,
    scheduleBotAnswer,
    startRoundTimer,
  ]);

  // Runs when a question starts: schedule the bot answer, and save the
  // question clock so a refresh resumes the countdown instead of granting a
  // fresh 25 seconds.
  useEffect(() => {
    if (!enabled || roundPhase !== "playing" || !roundStartedAt) {
      return;
    }

    clearBotTimer();
    scheduleBotAnswer();
    void persistScores();
  }, [
    clearBotTimer,
    enabled,
    persistScores,
    roundPhase,
    roundStartedAt,
    scheduleBotAnswer,
  ]);

  return { clearBotTimers, persistScores, roundTimeUp, advanceAfterResult };
}
