"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getBotResponseDelayMs, simulateBotAnswer } from "@/lib/bot";
import { pulseCountdownHaptic } from "@/lib/haptics";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useGameStore } from "@/store/useGameStore";
import type { CorrectAnswer } from "@/types/database.types";
import type { ProficiencyLevel } from "@/lib/constants";

const TOPIC_REVEAL_MS = 750;
const ROUND_RESULT_MS = 3000;
const ROUND_DURATION_SEC = 25;

type AnswerLockedPayload = {
  playerRole: "a" | "b";
  questionIndex: number;
  answer: CorrectAnswer | null;
  responseTimeMs: number | null;
};

type UseGameLoopOptions = {
  sessionId: string;
  localUserId: string;
  localPlayerRole: "a" | "b";
  isBotMatch: boolean;
  proficiencyLevel: ProficiencyLevel;
};

export function useGameLoop({
  sessionId,
  localUserId,
  localPlayerRole,
  isBotMatch,
  proficiencyLevel,
}: UseGameLoopOptions) {
  const { play } = useGameAudio();
  const supabase = createClient();

  const roundPhase = useGameStore((state) => state.roundPhase);
  const currentQuestionIndex = useGameStore((state) => state.currentQuestionIndex);
  const playlist = useGameStore((state) => state.playlist);
  const playerAAnswer = useGameStore((state) => state.playerAAnswer);
  const playerBAnswer = useGameStore((state) => state.playerBAnswer);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const roundStartedAt = useGameStore((state) => state.roundStartedAt);

  const initGameplay = useGameStore((state) => state.initGameplay);
  const setRoundPhase = useGameStore((state) => state.setRoundPhase);
  const beginRound = useGameStore((state) => state.beginRound);
  const setTimeRemaining = useGameStore((state) => state.setTimeRemaining);
  const lockLocalAnswer = useGameStore((state) => state.lockLocalAnswer);
  const lockOpponentAnswer = useGameStore((state) => state.lockOpponentAnswer);
  const resolveRound = useGameStore((state) => state.resolveRound);
  const advanceToNextRound = useGameStore((state) => state.advanceToNextRound);

  const topicTimerRef = useRef<number | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const roundTimerRef = useRef<number | null>(null);
  const botTimerRef = useRef<number | null>(null);
  const resolvingRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const clearTimers = useCallback(() => {
    if (topicTimerRef.current) {
      window.clearTimeout(topicTimerRef.current);
      topicTimerRef.current = null;
    }
    if (resultTimerRef.current) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    if (roundTimerRef.current) {
      window.clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (botTimerRef.current) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  const broadcastAnswer = useCallback(
    (payload: AnswerLockedPayload) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "answer_locked",
        payload,
      });
    },
    []
  );

  const bothAnswersLocked = useCallback(() => {
    const state = useGameStore.getState();
    return Boolean(state.playerAAnswer && state.playerBAnswer);
  }, []);

  const finalizeRound = useCallback(() => {
    if (resolvingRef.current) {
      return;
    }

    resolvingRef.current = true;
    clearTimers();

    const state = useGameStore.getState();
    const question = state.playlist[currentQuestionIndex];
    const answerA = state.playerAAnswer;
    const answerB = state.playerBAnswer;
    const role = state.localPlayerRole;

    const localCorrect =
      question &&
      ((role === "a" && answerA?.answer === question.correct_answer) ||
        (role === "b" && answerB?.answer === question.correct_answer));

    if (localCorrect) {
      play("correct");
    } else {
      play("incorrect");
    }

    resolveRound();

    resultTimerRef.current = window.setTimeout(() => {
      resolvingRef.current = false;
      advanceToNextRound();
    }, ROUND_RESULT_MS);
  }, [advanceToNextRound, clearTimers, currentQuestionIndex, play, resolveRound]);

  const scheduleBotAnswer = useCallback(() => {
    if (!isBotMatch) {
      return;
    }

    const question = useGameStore.getState().playlist[currentQuestionIndex];
    const proficiency = useGameStore.getState().proficiencyLevel;
    if (!question || !proficiency) {
      return;
    }

    const delay = getBotResponseDelayMs();
    const botRole = localPlayerRole === "a" ? "b" : "a";

    botTimerRef.current = window.setTimeout(() => {
      const state = useGameStore.getState();
      const botAlreadyAnswered =
        botRole === "a" ? state.playerAAnswer : state.playerBAnswer;

      if (botAlreadyAnswered || state.roundPhase === "round_result") {
        return;
      }

      const answer = simulateBotAnswer(question, proficiency);
      lockOpponentAnswer(answer, delay);

      broadcastAnswer({
        playerRole: botRole,
        questionIndex: currentQuestionIndex,
        answer,
        responseTimeMs: delay,
      });

      if (bothAnswersLocked()) {
        finalizeRound();
      }
    }, delay);
  }, [
    broadcastAnswer,
    bothAnswersLocked,
    currentQuestionIndex,
    finalizeRound,
    isBotMatch,
    localPlayerRole,
    lockOpponentAnswer,
  ]);

  const startRoundTimer = useCallback(() => {
    if (roundTimerRef.current) {
      window.clearInterval(roundTimerRef.current);
    }

    roundTimerRef.current = window.setInterval(() => {
      const state = useGameStore.getState();
      if (state.roundPhase !== "playing" && state.roundPhase !== "waiting") {
        return;
      }

      const startedAt = state.roundStartedAt ?? Date.now();
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, ROUND_DURATION_SEC - elapsedSec);

      setTimeRemaining(remaining);

      if (remaining > 0 && remaining <= 5) {
        pulseCountdownHaptic();
      }

      if (remaining === 0) {
        window.clearInterval(roundTimerRef.current!);
        roundTimerRef.current = null;

        const localRole = state.localPlayerRole;
        const localAnswer =
          localRole === "a" ? state.playerAAnswer : state.playerBAnswer;

        if (!localAnswer && localRole) {
          lockLocalAnswer(null, null);
          broadcastAnswer({
            playerRole: localRole,
            questionIndex: state.currentQuestionIndex,
            answer: null,
            responseTimeMs: null,
          });
        }

        if (isBotMatch) {
          const botRole = localRole === "a" ? "b" : "a";
          const botAnswer =
            botRole === "a" ? state.playerAAnswer : state.playerBAnswer;
          if (!botAnswer) {
            lockOpponentAnswer(null, null);
          }
        }

        finalizeRound();
      }
    }, 250);
  }, [
    broadcastAnswer,
    finalizeRound,
    isBotMatch,
    lockLocalAnswer,
    lockOpponentAnswer,
    setTimeRemaining,
  ]);

  const handleSelectAnswer = useCallback(
    (answer: CorrectAnswer) => {
      const state = useGameStore.getState();
      if (state.roundPhase !== "playing" || !state.roundStartedAt) {
        return;
      }

      const localAnswer =
        state.localPlayerRole === "a" ? state.playerAAnswer : state.playerBAnswer;
      if (localAnswer) {
        return;
      }

      play("click");
      const responseTimeMs = Date.now() - state.roundStartedAt;
      lockLocalAnswer(answer, responseTimeMs);

      broadcastAnswer({
        playerRole: state.localPlayerRole!,
        questionIndex: state.currentQuestionIndex,
        answer,
        responseTimeMs,
      });

      if (bothAnswersLocked()) {
        finalizeRound();
      }
    },
    [bothAnswersLocked, broadcastAnswer, finalizeRound, lockLocalAnswer, play]
  );

  useEffect(() => {
    initGameplay({
      localUserId,
      localPlayerRole,
      isBotMatch,
      proficiencyLevel,
    });
  }, [
    initGameplay,
    isBotMatch,
    localPlayerRole,
    localUserId,
    proficiencyLevel,
  ]);

  useEffect(() => {
    const channel = supabase.channel(`game_session:${sessionId}`);

    channel
      .on("broadcast", { event: "answer_locked" }, ({ payload }) => {
        const data = payload as AnswerLockedPayload;
        const state = useGameStore.getState();

        if (data.questionIndex !== state.currentQuestionIndex) {
          return;
        }
        if (data.playerRole === state.localPlayerRole) {
          return;
        }

        lockOpponentAnswer(data.answer, data.responseTimeMs);

        const updated = useGameStore.getState();
        if (updated.playerAAnswer && updated.playerBAnswer) {
          finalizeRound();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [finalizeRound, lockOpponentAnswer, sessionId, supabase]);

  useEffect(() => {
    clearTimers();
    resolvingRef.current = false;

    if (roundPhase === "topic_reveal") {
      play("reveal");

      topicTimerRef.current = window.setTimeout(() => {
        beginRound();
        scheduleBotAnswer();
        startRoundTimer();
      }, TOPIC_REVEAL_MS);
    }

    if (roundPhase === "playing" && roundStartedAt) {
      scheduleBotAnswer();
      startRoundTimer();
    }

    if (roundPhase === "waiting") {
      if (bothAnswersLocked()) {
        finalizeRound();
      }
    }

    return clearTimers;
  }, [
    beginRound,
    bothAnswersLocked,
    clearTimers,
    currentQuestionIndex,
    finalizeRound,
    play,
    roundPhase,
    roundStartedAt,
    scheduleBotAnswer,
    startRoundTimer,
  ]);

  useEffect(() => {
    if (roundPhase !== "playing" && roundPhase !== "waiting") {
      return;
    }

    if (playerAAnswer && playerBAnswer) {
      finalizeRound();
    }
  }, [
    finalizeRound,
    playerAAnswer,
    playerBAnswer,
    roundPhase,
  ]);

  const currentQuestion = playlist[currentQuestionIndex] ?? null;

  return {
    roundPhase,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: playlist.length,
    timeRemaining,
    roundStartedAt,
    handleSelectAnswer,
    playerAAnswer,
    playerBAnswer,
  };
}
