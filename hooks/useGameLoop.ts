"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { buildMatchScoreState } from "@/lib/match-score-state";
import {
  fetchTiebreakerQuestionClient,
  persistMatchScoreState,
} from "@/lib/match-sync-client";
import {
  getBotResponseDelayMs,
  getBotResponseTimeMs,
  simulateBotAnswer,
} from "@/lib/bot";
import { pulseCountdownHaptic } from "@/lib/haptics";
import {
  FRESH_ROUND_TIMER_STATE,
  getRoundPauseMs,
  getRoundTimeRemainingSec,
} from "@/lib/match-timer";
import { getRoundResultMs, TOPIC_REVEAL_MS } from "@/lib/match-timing";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useServerMatchSync } from "@/hooks/useServerMatchSync";
import { useGameStore } from "@/store/useGameStore";
import { REGULAR_MATCH_QUESTIONS } from "@/lib/match";
import type { CorrectAnswer, QuestionActive } from "@/types/database.types";
import {
  TARGET_LANGUAGE,
  type ProficiencyLevel,
} from "@/lib/constants";

const ROUND_RESULT_TICK_MS = 100;

type AnswerLockedPayload = {
  playerRole: "a" | "b";
  questionIndex: number;
  answer: CorrectAnswer | null;
  responseTimeMs: number | null;
};

type ReportPausePayload = {
  paused: boolean;
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
  const isReportDialogOpen = useGameStore((state) => state.isReportDialogOpen);
  const timerPauseOffsetMs = useGameStore((state) => state.timerPauseOffsetMs);
  const timerPauseStartedAt = useGameStore(
    (state) => state.timerPauseStartedAt
  );

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
  /** Host: round index we are trying to publish after the result screen. */
  const pendingNextRoundRef = useRef<number | null>(null);
  /** Host: sudden-death question to re-append if the publish retries. */
  const pendingAppendQuestionRef = useRef<QuestionActive | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelReadyRef = useRef(false);
  const pendingBroadcastsRef = useRef<AnswerLockedPayload[]>([]);
  const opponentReportPausedRef = useRef(false);
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

  /**
   * Reliable path alongside the broadcast: persist the locked answer on the
   * session row so the opponent's sync poll picks it up even if the realtime
   * message is dropped. Writes go DIRECTLY to Supabase (RLS-protected) — a
   * server action here would queue behind other actions and add latency.
   *
   * Goes through the submit_match_answer RPC (not a raw table update): the
   * RPC looks up which column (answer_a/answer_b) the caller actually owns
   * server-side, so a tampered client can no longer write the opponent's
   * answer column. See supabase/match-answer-integrity-migration.sql.
   */
  const persistAnswer = useCallback(
    async (payload: {
      questionIndex: number;
      answer: CorrectAnswer | null;
      responseTimeMs: number | null;
    }) => {
      if (isBotMatch) {
        return;
      }

      const responseTimeMs =
        payload.responseTimeMs === null
          ? null
          : Math.round(payload.responseTimeMs);

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const { error } = await supabase.rpc("submit_match_answer", {
          p_session_id: sessionId,
          p_question_index: payload.questionIndex,
          p_answer: payload.answer,
          p_response_time_ms: responseTimeMs,
        });

        if (!error) {
          return;
        }
        console.error(
          `[match-sync] answer write failed (attempt ${attempt}): ${error.message}`
        );
      }
    },
    [isBotMatch, sessionId, supabase]
  );

  const bothAnswersLocked = useCallback(() => {
    const state = useGameStore.getState();
    return Boolean(state.playerAAnswer && state.playerBAnswer);
  }, []);

  /** Push cumulative scores to the session row so a refresh cannot wipe them. */
  const persistScores = useCallback(async () => {
    const state = useGameStore.getState();
    if (!state.gameSessionId) {
      return;
    }

    const result = await persistMatchScoreState(
      supabase,
      state.gameSessionId,
      buildMatchScoreState(state)
    );

    if (!result.success) {
      console.error(`[match-sync] score persist failed: ${result.error}`);
    }
  }, [supabase]);

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
      const pauseMs = getRoundPauseMs(state);
      const remaining = getRoundTimeRemainingSec(startedAt, pauseMs);

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
          void persistAnswer({
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
    persistAnswer,
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
    const pauseMs = getRoundPauseMs(state);
    const delay = getBotResponseDelayMs(startedAt, botDifficulty, pauseMs);
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
        ...FRESH_ROUND_TIMER_STATE,
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
    opponentReportPausedRef.current = false;
    setRoundResultSecondsLeft(null);
  }, [clearTimers]);

  const leaderStartRoundRef = useRef<
    ReturnType<typeof useServerMatchSync>["leaderStartRound"]
  >(async () => false);
  const leaderFinishMatchRef = useRef<
    ReturnType<typeof useServerMatchSync>["leaderFinishMatch"]
  >(async () => false);

  const advanceAfterResult = useCallback(() => {
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

      // Sudden-death: tied after the 10 regular questions → one extra round.
      if (finishedRegularRound && isScoreTied && !latest.tiebreakerUsed) {
        setRoundPhase("tiebreaker_loading");

        const excludeIds = latest.playlist.map((item) => item.id);
        let tiebreaker: Awaited<
          ReturnType<typeof fetchTiebreakerQuestionClient>
        > | null = null;

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          // Browser → Supabase RPC (not a server action) so the fetch cannot
          // stall behind the per-tab Next.js action queue.
          tiebreaker = await fetchTiebreakerQuestionClient(supabase, {
            language: TARGET_LANGUAGE,
            level: proficiencyLevel,
            userId: localUserId,
            excludeIds,
          });
          if (tiebreaker.success) {
            break;
          }
          console.error(
            `[match] tiebreaker fetch failed (attempt ${attempt}): ${tiebreaker.error}`
          );
        }

        if (tiebreaker?.success) {
          if (isBotMatch) {
            startTiebreakerRound(tiebreaker.data);
            void persistScores();
            return;
          }

          // Append locally so the host playlist covers Q11, but stay on
          // tiebreaker_loading until publish/applySync advances BOTH clients
          // from the same server-stamped round record.
          useGameStore.setState((state) => ({
            playlist: state.playlist.some(
              (question) => question.id === tiebreaker.data.id
            )
              ? state.playlist
              : [...state.playlist, tiebreaker.data],
            tiebreakerQuestion: tiebreaker.data,
            tiebreakerUsed: true,
            roundPhase: "tiebreaker_loading",
          }));
          void persistScores();

          const tiebreakerIndex = REGULAR_MATCH_QUESTIONS;
          pendingNextRoundRef.current = tiebreakerIndex;
          pendingAppendQuestionRef.current = tiebreaker.data;
          const published = await leaderStartRoundRef.current(
            tiebreakerIndex,
            tiebreaker.data
          );
          if (published) {
            pendingNextRoundRef.current = null;
            pendingAppendQuestionRef.current = null;
          }
          return;
        }

        // No sudden-death question available — end as a true tie rather than
        // inventing a winner from response times.
        console.error(
          "[match] tiebreaker unavailable; finishing tied match without sudden-death"
        );
      }

      if (isBotMatch) {
        advanceToNextRound();
        const afterAdvance = useGameStore.getState();
        void persistScores();
        if (afterAdvance.roundPhase === "match_finished") {
          return;
        }
        startTopicReveal(afterAdvance.currentQuestionIndex);
        return;
      }

      const nextIndex = latest.currentQuestionIndex + 1;
      if (nextIndex >= latest.playlist.length) {
        pendingNextRoundRef.current = null;
        pendingAppendQuestionRef.current = null;
        advanceToNextRound();
        void persistScores();
        void leaderFinishMatchRef.current();
        return;
      }

      pendingNextRoundRef.current = nextIndex;
      pendingAppendQuestionRef.current = null;
      const published = await leaderStartRoundRef.current(nextIndex);
      if (published) {
        pendingNextRoundRef.current = null;
      }
    })();
  }, [
    advanceToNextRound,
    isBotMatch,
    isSyncLeader,
    localUserId,
    persistScores,
    proficiencyLevel,
    setRoundPhase,
    startTiebreakerRound,
    startTopicReveal,
    supabase,
  ]);

  const scheduleRoundResultCountdown = useCallback(() => {
    if (resultTimerRef.current !== null) {
      return;
    }

    resolvingRef.current = true;
    resultRemainingMsRef.current = getRoundResultMs(isBotMatch);
    setRoundResultSecondsLeft(resultRemainingMsRef.current / 1000);

    resultTimerRef.current = window.setInterval(() => {
      const latest = useGameStore.getState();

      if (latest.roundPhase !== "round_result") {
        clearResultTimer();
        setRoundResultSecondsLeft(null);
        return;
      }

      if (latest.isReportDialogOpen || opponentReportPausedRef.current) {
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
  }, [advanceAfterResult, clearResultTimer, isBotMatch]);

  const handleResumedRoundResult = useCallback(() => {
    // Refresh landed on an already-scored round — continue the between-round
    // beat so the host can publish the next question (no double-scoring).
    clearRoundTimers();
    clearBotTimer();
    scheduleRoundResultCountdown();
  }, [clearBotTimer, clearRoundTimers, scheduleRoundResultCountdown]);

  const serverSync = useServerMatchSync({
    sessionId,
    isLeader: isSyncLeader,
    serverPlaylist,
    enabled: !isBotMatch,
    onEnterPlaying: startRoundTimer,
    onNewRound: handleNewSyncRound,
    onBothAnswersLocked: () => {
      if (useGameStore.getState().roundPhase === "playing") {
        finalizeRoundRef.current();
      }
    },
    onResumedRoundResult: handleResumedRoundResult,
  });

  leaderStartRoundRef.current = serverSync.leaderStartRound;
  leaderFinishMatchRef.current = serverSync.leaderFinishMatch;

  const finalizeRound = useCallback(() => {
    if (resolvingRef.current) {
      return;
    }

    resolvingRef.current = true;
    clearTimers();

    const state = useGameStore.getState();
    const question = state.playlist[state.currentQuestionIndex];
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
    void persistScores();
    scheduleRoundResultCountdown();
  }, [
    clearTimers,
    persistScores,
    play,
    resolveRound,
    scheduleRoundResultCountdown,
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
      // roundStartedAt is derived from the Postgres clock (fractional ms),
      // so this can come out non-integer — round once here since it feeds
      // local state, the opponent broadcast, and the DB write.
      const responseTimeMs = Math.round(
        Date.now() - state.roundStartedAt - getRoundPauseMs(state)
      );
      lockLocalAnswer(answer, responseTimeMs);

      broadcastAnswer({
        playerRole: state.localPlayerRole!,
        questionIndex: state.currentQuestionIndex,
        answer,
        responseTimeMs,
      });
      void persistAnswer({
        questionIndex: state.currentQuestionIndex,
        answer,
        responseTimeMs,
      });

      if (bothAnswersLocked()) {
        finalizeRound();
      }
    },
    [
      bothAnswersLocked,
      broadcastAnswer,
      finalizeRound,
      lockLocalAnswer,
      persistAnswer,
      play,
    ]
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
      return;
    }

    channelReadyRef.current = false;
    pendingBroadcastsRef.current = [];

    const channel = supabase.channel(`game_session:${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "report_pause" }, ({ payload }) => {
        const data = payload as ReportPausePayload;
        opponentReportPausedRef.current = Boolean(data.paused);
      })
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
          flushPendingBroadcasts();
          if (useGameStore.getState().isReportDialogOpen) {
            void channel.send({
              type: "broadcast",
              event: "report_pause",
              payload: { paused: true } satisfies ReportPausePayload,
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      channelReadyRef.current = false;
      pendingBroadcastsRef.current = [];
      opponentReportPausedRef.current = false;
    };
  }, [flushPendingBroadcasts, isBotMatch, sessionId, supabase]);

  useEffect(() => {
    if (isBotMatch || !channelReadyRef.current || !channelRef.current) {
      return;
    }

    void channelRef.current.send({
      type: "broadcast",
      event: "report_pause",
      payload: { paused: isReportDialogOpen } satisfies ReportPausePayload,
    });
  }, [isBotMatch, isReportDialogOpen]);

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

  // Reschedule the bot answer when the report dialog pauses the round timer.
  useEffect(() => {
    if (!isBotMatch || roundPhase !== "playing" || !roundStartedAt) {
      return;
    }

    clearBotTimer();
    scheduleBotAnswer();
  }, [
    clearBotTimer,
    isBotMatch,
    isReportDialogOpen,
    roundPhase,
    roundStartedAt,
    scheduleBotAnswer,
    timerPauseOffsetMs,
    timerPauseStartedAt,
  ]);

  // Host safety net: if the result screen finished but the round publish did
  // not land (network blip, RLS, etc.), retry every 2s until both clients move.
  useEffect(() => {
    if (isBotMatch || !isSyncLeader) {
      return;
    }

    const interval = window.setInterval(() => {
      const pending = pendingNextRoundRef.current;
      if (pending === null) {
        return;
      }

      const live = useGameStore.getState();
      // Sudden-death stays on tiebreaker_loading until the publish lands;
      // regular advances retry from the result screen.
      if (
        live.roundPhase !== "round_result" &&
        live.roundPhase !== "tiebreaker_loading"
      ) {
        return;
      }

      if (live.currentQuestionIndex >= pending) {
        pendingNextRoundRef.current = null;
        pendingAppendQuestionRef.current = null;
        return;
      }

      void leaderStartRoundRef.current(
        pending,
        pendingAppendQuestionRef.current ?? undefined
      ).then((published) => {
        if (published) {
          pendingNextRoundRef.current = null;
          pendingAppendQuestionRef.current = null;
        }
      });
    }, 2_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isBotMatch, isSyncLeader]);

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
  };
}
