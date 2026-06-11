"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTiebreakerQuestion } from "@/app/dashboard/match/actions";
import { createClient } from "@/utils/supabase/client";
import {
  getBotResponseDelayMs,
  getBotResponseTimeMs,
  simulateBotAnswer,
} from "@/lib/bot";
import { pulseCountdownHaptic } from "@/lib/haptics";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useServerMatchSync } from "@/hooks/useServerMatchSync";
import { useGameStore } from "@/store/useGameStore";
import { REGULAR_MATCH_QUESTIONS } from "@/lib/match";
import type { CorrectAnswer, QuestionActive } from "@/types/database.types";
import type { ProficiencyLevel } from "@/lib/constants";

const TOPIC_REVEAL_MS = 750;
const ROUND_RESULT_MS = 2_500;
const ROUND_RESULT_TICK_MS = 100;
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
  serverPlaylist: QuestionActive[];
};

export function useGameLoop({
  sessionId,
  localUserId,
  localPlayerRole,
  isBotMatch,
  proficiencyLevel,
  serverPlaylist,
}: UseGameLoopOptions) {
  const { play } = useGameAudio();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const isSyncLeader = !isBotMatch && localPlayerRole === "a";

  const roundPhase = useGameStore((state) => state.roundPhase);
  const currentQuestionIndex = useGameStore((state) => state.currentQuestionIndex);
  const playlist = useGameStore((state) => state.playlist);
  const playerAAnswer = useGameStore((state) => state.playerAAnswer);
  const playerBAnswer = useGameStore((state) => state.playerBAnswer);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const roundStartedAt = useGameStore((state) => state.roundStartedAt);

  const initGameplay = useGameStore((state) => state.initGameplay);
  const beginRound = useGameStore((state) => state.beginRound);
  const setTimeRemaining = useGameStore((state) => state.setTimeRemaining);
  const lockLocalAnswer = useGameStore((state) => state.lockLocalAnswer);
  const lockOpponentAnswer = useGameStore((state) => state.lockOpponentAnswer);
  const resolveRound = useGameStore((state) => state.resolveRound);
  const advanceToNextRound = useGameStore((state) => state.advanceToNextRound);
  const startTiebreakerRound = useGameStore((state) => state.startTiebreakerRound);
  const setRoundPhase = useGameStore((state) => state.setRoundPhase);

  const topicTimerRef = useRef<number | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const roundTimerRef = useRef<number | null>(null);
  const botTimerRef = useRef<number | null>(null);
  const resolvingRef = useRef(false);
  const resultRemainingMsRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelReadyRef = useRef(false);
  const pendingBroadcastsRef = useRef<AnswerLockedPayload[]>([]);
  const [channelReady, setChannelReady] = useState(isBotMatch);
  const [roundResultSecondsLeft, setRoundResultSecondsLeft] = useState<
    number | null
  >(null);

  const clearRoundTimers = useCallback(() => {
    if (topicTimerRef.current) {
      window.clearTimeout(topicTimerRef.current);
      topicTimerRef.current = null;
    }
    if (roundTimerRef.current) {
      window.clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
  }, []);

  const clearResultTimer = useCallback(() => {
    if (resultTimerRef.current) {
      window.clearInterval(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  const clearBotTimer = useCallback(() => {
    if (botTimerRef.current) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearRoundTimers();
    clearResultTimer();
    clearBotTimer();
  }, [clearBotTimer, clearResultTimer, clearRoundTimers]);

  const flushPendingBroadcasts = useCallback(() => {
    if (!channelReadyRef.current || !channelRef.current) {
      return;
    }

    const pending = pendingBroadcastsRef.current;
    pendingBroadcastsRef.current = [];

    for (const payload of pending) {
      void channelRef.current.send({
        type: "broadcast",
        event: "answer_locked",
        payload,
      });
    }
  }, []);

  const broadcastAnswer = useCallback(
    (payload: AnswerLockedPayload) => {
      if (isBotMatch || !channelReadyRef.current) {
        pendingBroadcastsRef.current.push(payload);
        return;
      }

      void channelRef.current?.send({
        type: "broadcast",
        event: "answer_locked",
        payload,
      });
    },
    [isBotMatch]
  );

  const bothAnswersLocked = useCallback(() => {
    const state = useGameStore.getState();
    return Boolean(state.playerAAnswer && state.playerBAnswer);
  }, []);

  const startRoundTimer = useCallback(() => {
    if (roundTimerRef.current) {
      window.clearInterval(roundTimerRef.current);
    }

    roundTimerRef.current = window.setInterval(() => {
      const state = useGameStore.getState();
      if (state.roundPhase !== "playing") {
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

        finalizeRoundRef.current();
      }
    }, 250);
  }, [
    broadcastAnswer,
    isBotMatch,
    lockLocalAnswer,
    lockOpponentAnswer,
    setTimeRemaining,
  ]);

  const scheduleBotAnswer = useCallback(() => {
    if (!isBotMatch || botTimerRef.current) {
      return;
    }

    const state = useGameStore.getState();
    const question = state.playlist[state.currentQuestionIndex];
    const proficiency = state.proficiencyLevel ?? proficiencyLevel;
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

      const latestDifficulty = latest.botDifficulty ?? "medium";
      const answer = simulateBotAnswer(question, proficiency, latestDifficulty);
      const responseTimeMs = getBotResponseTimeMs(latestDifficulty);

      lockOpponentAnswer(answer, responseTimeMs);

      broadcastAnswer({
        playerRole: botRole,
        questionIndex,
        answer,
        responseTimeMs,
      });

      if (bothAnswersLocked()) {
        finalizeRoundRef.current();
      }
    }, delay);
  }, [
    broadcastAnswer,
    bothAnswersLocked,
    isBotMatch,
    localPlayerRole,
    lockOpponentAnswer,
    proficiencyLevel,
  ]);

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
      clearRoundTimers();
      resolvingRef.current = false;

      useGameStore.setState({
        currentQuestionIndex: questionIndex,
        roundPhase: "topic_reveal",
        playerAAnswer: null,
        playerBAnswer: null,
        roundStartedAt: null,
        timeRemaining: ROUND_DURATION_SEC,
        lastRoundPointsA: 0,
        lastRoundPointsB: 0,
      });

      play("reveal");

      topicTimerRef.current = window.setTimeout(() => {
        beginRoundPlaying(questionIndex, Date.now());
      }, TOPIC_REVEAL_MS);
    },
    [beginRoundPlaying, clearRoundTimers, play]
  );

  const handleNewSyncRound = useCallback(() => {
    // A new round arrived from the server: drop all timers and per-round
    // flags so a stale result countdown can't block the next finalize.
    clearTimers();
    resolvingRef.current = false;
    setRoundResultSecondsLeft(null);
  }, [clearTimers]);

  const serverSync = useServerMatchSync({
    sessionId,
    isLeader: isSyncLeader,
    serverPlaylist,
    enabled: !isBotMatch,
    onEnterPlaying: startRoundTimer,
    onNewRound: handleNewSyncRound,
  });

  const leaderStartRoundRef = useRef(serverSync.leaderStartRound);
  leaderStartRoundRef.current = serverSync.leaderStartRound;
  const leaderFinishMatchRef = useRef(serverSync.leaderFinishMatch);
  leaderFinishMatchRef.current = serverSync.leaderFinishMatch;

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

    resultRemainingMsRef.current = ROUND_RESULT_MS;
    setRoundResultSecondsLeft(ROUND_RESULT_MS / 1000);

    const advanceAfterResult = () => {
      void (async () => {
        resolvingRef.current = false;
        setRoundResultSecondsLeft(null);

        if (!isBotMatch && !isSyncLeader) {
          return;
        }

        const latest = useGameStore.getState();
        const finishedRegularRound =
          latest.currentQuestionIndex === REGULAR_MATCH_QUESTIONS - 1;
        const isScoreTied = latest.playerAScore === latest.playerBScore;

        if (finishedRegularRound && isScoreTied && !latest.tiebreakerUsed) {
          setRoundPhase("tiebreaker_loading");

          const result = await fetchTiebreakerQuestion(
            latest.playlist.map((item) => item.id)
          );

          if (result.success) {
            startTiebreakerRound(result.data);
            if (isBotMatch) {
              return;
            }
            // Publish the tiebreaker round; the appended question id lets the
            // opponent refetch the extended playlist.
            void leaderStartRoundRef.current(
              useGameStore.getState().currentQuestionIndex,
              result.data.id
            );
            return;
          }
        }

        if (isBotMatch) {
          advanceToNextRound();
          const afterAdvance = useGameStore.getState();
          if (afterAdvance.roundPhase === "match_finished") {
            return;
          }
          startTopicReveal(afterAdvance.currentQuestionIndex);
          return;
        }

        const nextIndex = latest.currentQuestionIndex + 1;
        if (nextIndex >= latest.playlist.length) {
          advanceToNextRound();
          void leaderFinishMatchRef.current();
          return;
        }

        void leaderStartRoundRef.current(nextIndex);
      })();
    };

    resultTimerRef.current = window.setInterval(() => {
      const latest = useGameStore.getState();

      if (latest.roundPhase !== "round_result") {
        clearResultTimer();
        setRoundResultSecondsLeft(null);
        return;
      }

      if (latest.isReportDialogOpen) {
        return;
      }

      resultRemainingMsRef.current -= ROUND_RESULT_TICK_MS;
      setRoundResultSecondsLeft(
        Math.max(0, resultRemainingMsRef.current / 1000)
      );

      if (resultRemainingMsRef.current <= 0) {
        clearResultTimer();
        advanceAfterResult();
      }
    }, ROUND_RESULT_TICK_MS);
  }, [
    advanceToNextRound,
    clearResultTimer,
    clearTimers,
    currentQuestionIndex,
    isBotMatch,
    isSyncLeader,
    play,
    resolveRound,
    setRoundPhase,
    startTiebreakerRound,
    startTopicReveal,
  ]);

  const finalizeRoundRef = useRef(finalizeRound);
  finalizeRoundRef.current = finalizeRound;

  const lockOpponentAnswerRef = useRef(lockOpponentAnswer);
  lockOpponentAnswerRef.current = lockOpponentAnswer;

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
    if (isBotMatch && serverPlaylist.length > 0) {
      useGameStore.setState({ playlist: serverPlaylist });
    }
  }, [isBotMatch, serverPlaylist]);

  useEffect(() => {
    if (isBotMatch) {
      channelReadyRef.current = true;
      setChannelReady(true);
      return;
    }

    channelReadyRef.current = false;
    setChannelReady(false);
    pendingBroadcastsRef.current = [];

    const channel = supabase.channel(`game_session:${sessionId}`, {
      config: { broadcast: { self: false } },
    });

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

        lockOpponentAnswerRef.current(data.answer, data.responseTimeMs);

        const updated = useGameStore.getState();
        if (updated.playerAAnswer && updated.playerBAnswer) {
          finalizeRoundRef.current();
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
          channelReadyRef.current = true;
          setChannelReady(true);
          flushPendingBroadcasts();
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      channelReadyRef.current = false;
      pendingBroadcastsRef.current = [];
    };
  }, [flushPendingBroadcasts, isBotMatch, sessionId, supabase]);

  useEffect(() => {
    if (!isBotMatch) {
      if (roundPhase === "playing" && roundStartedAt) {
        startRoundTimer();
      }
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

    return clearRoundTimers;
  }, [
    beginRoundPlaying,
    clearRoundTimers,
    clearTimers,
    currentQuestionIndex,
    isBotMatch,
    play,
    roundPhase,
    roundStartedAt,
    scheduleBotAnswer,
    startRoundTimer,
  ]);

  useEffect(() => {
    if (roundPhase !== "playing") {
      return;
    }

    if (playerAAnswer && playerBAnswer) {
      finalizeRound();
    }
  }, [finalizeRound, playerAAnswer, playerBAnswer, roundPhase]);

  const currentQuestion = playlist[currentQuestionIndex] ?? null;
  const isTiebreakerRound = currentQuestionIndex >= REGULAR_MATCH_QUESTIONS;

  return {
    roundPhase,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: REGULAR_MATCH_QUESTIONS,
    isTiebreakerRound,
    timeRemaining,
    roundStartedAt,
    handleSelectAnswer,
    playerAAnswer,
    playerBAnswer,
    roundResultSecondsLeft,
    channelReady,
  };
}
