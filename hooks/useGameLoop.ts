"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTiebreakerQuestion } from "@/app/dashboard/match/actions";
import { updateMatchSyncState } from "@/app/dashboard/match/sync-actions";
import { getMatchSession } from "@/app/dashboard/matchmaking/actions";
import { createClient } from "@/utils/supabase/client";
import {
  getBotResponseDelayMs,
  getBotResponseTimeMs,
  simulateBotAnswer,
} from "@/lib/bot";
import { pulseCountdownHaptic } from "@/lib/haptics";
import {
  isMatchSyncPayload,
  isMatchSyncState,
  MATCH_SYNC_EVENT,
  playlistIdsSignature,
  type MatchSyncPayload,
  type MatchSyncState,
} from "@/lib/match-sync";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useGameStore } from "@/store/useGameStore";
import { REGULAR_MATCH_QUESTIONS } from "@/lib/match";
import type { CorrectAnswer } from "@/types/database.types";
import type { ProficiencyLevel } from "@/lib/constants";

const TOPIC_REVEAL_MS = 750;
/** Time on the answer reveal screen before the next question. */
const ROUND_RESULT_MS = 2_500;
const ROUND_RESULT_TICK_MS = 100;
const ROUND_DURATION_SEC = 25;
const MATCH_START_FALLBACK_MS = 1_500;
const SYNC_REQUEST_INTERVAL_MS = 800;
const SYNC_PULSE_INTERVAL_MS = 400;
const SYNC_PULSE_MAX = 20;

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
  const peerReadyRef = useRef({ a: isBotMatch, b: isBotMatch });
  const matchSyncStartedRef = useRef(isBotMatch);
  const syncQueueRef = useRef<MatchSyncPayload[]>([]);
  const processingSyncQueueRef = useRef(false);
  const lastAppliedSyncAtRef = useRef(0);
  const matchStartFallbackRef = useRef<number | null>(null);
  const syncRequestIntervalRef = useRef<number | null>(null);
  const syncPulseIntervalRef = useRef<number | null>(null);
  const lastRoundPlayingRef = useRef<{
    questionIndex: number;
    startedAt: number;
  } | null>(null);
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

  const broadcastSync = useCallback((payload: MatchSyncPayload) => {
    if (isBotMatch || !channelReadyRef.current || !channelRef.current) {
      return;
    }

    void channelRef.current.send({
      type: "broadcast",
      event: MATCH_SYNC_EVENT,
      payload,
    });
  }, [isBotMatch]);

  const broadcastSyncRef = useRef(broadcastSync);
  broadcastSyncRef.current = broadcastSync;

  const isSyncLeaderRef = useRef(isSyncLeader);
  isSyncLeaderRef.current = isSyncLeader;

  const getPlaylistSig = useCallback(() => {
    return playlistIdsSignature(useGameStore.getState().playlist);
  }, []);

  const loadServerPlaylist = useCallback(async () => {
    const result = await getMatchSession(sessionId);
    if (!result.success || result.data.playlist.length === 0) {
      return result;
    }

    useGameStore.setState({ playlist: result.data.playlist });
    return result;
  }, [sessionId]);

  const ensurePlaylistAligned = useCallback(
    async (expectedSig: string) => {
      const state = useGameStore.getState();
      const localSig = playlistIdsSignature(state.playlist);

      if (localSig === expectedSig && state.playlist.length > 0) {
        return true;
      }

      const result = await loadServerPlaylist();
      if (!result.success || result.data.playlist.length === 0) {
        return false;
      }

      return true;
    },
    [loadServerPlaylist]
  );

  const persistLeaderSync = useCallback(
    (
      phase: MatchSyncState["phase"],
      questionIndex: number,
      roundStartedAt: number | null = null
    ) => {
      if (!isSyncLeader || isBotMatch) {
        return;
      }

      void updateMatchSyncState(sessionId, {
        questionIndex,
        phase,
        roundStartedAt,
        playlistSig: getPlaylistSig(),
      });
    },
    [getPlaylistSig, isBotMatch, isSyncLeader, sessionId]
  );

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
      if (!isBotMatch && !channelReadyRef.current) {
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

  const clearMatchStartFallback = useCallback(() => {
    if (matchStartFallbackRef.current !== null) {
      window.clearTimeout(matchStartFallbackRef.current);
      matchStartFallbackRef.current = null;
    }
  }, []);

  const clearSyncRequestInterval = useCallback(() => {
    if (syncRequestIntervalRef.current !== null) {
      window.clearInterval(syncRequestIntervalRef.current);
      syncRequestIntervalRef.current = null;
    }
  }, []);

  const clearSyncPulse = useCallback(() => {
    if (syncPulseIntervalRef.current !== null) {
      window.clearInterval(syncPulseIntervalRef.current);
      syncPulseIntervalRef.current = null;
    }
  }, []);

  const startSyncPulse = useCallback(() => {
    if (isBotMatch || !isSyncLeader) {
      return;
    }

    clearSyncPulse();

    let count = 0;
    syncPulseIntervalRef.current = window.setInterval(() => {
      const state = useGameStore.getState();
      const lastRound = lastRoundPlayingRef.current;

      const playlistSig = playlistIdsSignature(state.playlist);

      if (state.roundPhase === "playing" && lastRound) {
        broadcastSyncRef.current({
          type: "round_playing",
          questionIndex: lastRound.questionIndex,
          startedAt: lastRound.startedAt,
          playlistSig,
        });
      } else if (state.roundPhase === "topic_reveal") {
        broadcastSyncRef.current({
          type: "topic_reveal",
          questionIndex: state.currentQuestionIndex,
          at: Date.now(),
          playlistSig,
        });
      } else if (state.roundPhase === "match_finished") {
        broadcastSyncRef.current({ type: "match_finished" });
        clearSyncPulse();
        return;
      }

      count += 1;
      if (count >= SYNC_PULSE_MAX) {
        clearSyncPulse();
      }
    }, SYNC_PULSE_INTERVAL_MS);
  }, [clearSyncPulse, isBotMatch, isSyncLeader]);

  const beginRoundPlaying = useCallback(
    (questionIndex: number, startedAt: number, fromSync = false) => {
      const state = useGameStore.getState();
      if (state.currentQuestionIndex !== questionIndex) {
        useGameStore.setState({ currentQuestionIndex: questionIndex });
      }

      beginRound(startedAt);
      scheduleBotAnswer();
      startRoundTimer();

      if (!fromSync && isSyncLeader) {
        lastRoundPlayingRef.current = { questionIndex, startedAt };
        broadcastSync({
          type: "round_playing",
          questionIndex,
          startedAt,
          playlistSig: getPlaylistSig(),
        });
        persistLeaderSync("playing", questionIndex, startedAt);
        startSyncPulse();
      }
    },
    [
      beginRound,
      broadcastSync,
      getPlaylistSig,
      isSyncLeader,
      persistLeaderSync,
      scheduleBotAnswer,
      startRoundTimer,
      startSyncPulse,
    ]
  );

  const startTopicReveal = useCallback(
    (questionIndex: number, fromSync = false) => {
      clearRoundTimers();
      if (fromSync) {
        clearResultTimer();
        setRoundResultSecondsLeft(null);
      }
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

      if (!fromSync && isSyncLeader) {
        lastRoundPlayingRef.current = null;
        broadcastSync({
          type: "topic_reveal",
          questionIndex,
          at: Date.now(),
          playlistSig: getPlaylistSig(),
        });
        persistLeaderSync("topic_reveal", questionIndex, null);
        startSyncPulse();
      }

      if (!isBotMatch && !isSyncLeader) {
        return;
      }

      topicTimerRef.current = window.setTimeout(() => {
        beginRoundPlaying(questionIndex, Date.now(), false);
      }, TOPIC_REVEAL_MS);
    },
    [
      beginRoundPlaying,
      broadcastSync,
      clearResultTimer,
      clearRoundTimers,
      getPlaylistSig,
      isBotMatch,
      isSyncLeader,
      persistLeaderSync,
      play,
      startSyncPulse,
    ]
  );

  const countPresentPlayers = useCallback(
    (presenceState: Record<string, unknown[]>) => {
      const roles = new Set<"a" | "b">();

      for (const presences of Object.values(presenceState)) {
        for (const presence of presences) {
          const role = (presence as { playerRole?: string }).playerRole;
          if (role === "a" || role === "b") {
            roles.add(role);
          }
        }
      }

      return roles;
    },
    []
  );

  const maybeStartSyncedMatch = useCallback(() => {
    if (matchSyncStartedRef.current || !isSyncLeader) {
      return;
    }

    if (!peerReadyRef.current.a || !peerReadyRef.current.b) {
      return;
    }

    if (useGameStore.getState().playlist.length === 0) {
      return;
    }

    matchSyncStartedRef.current = true;
    clearMatchStartFallback();
    startTopicReveal(0, false);
  }, [clearMatchStartFallback, isSyncLeader, startTopicReveal]);

  const rebroadcastCurrentState = useCallback(() => {
    if (!isSyncLeader || isBotMatch) {
      return;
    }

    const state = useGameStore.getState();

    if (state.roundPhase === "match_finished") {
      broadcastSync({ type: "match_finished" });
      return;
    }

    if (state.roundPhase === "playing" && state.roundStartedAt) {
      lastRoundPlayingRef.current = {
        questionIndex: state.currentQuestionIndex,
        startedAt: state.roundStartedAt,
      };
      broadcastSync({
        type: "round_playing",
        questionIndex: state.currentQuestionIndex,
        startedAt: state.roundStartedAt,
        playlistSig: playlistIdsSignature(state.playlist),
      });
      startSyncPulse();
      return;
    }

    if (
      state.roundPhase === "topic_reveal" ||
      (!matchSyncStartedRef.current && state.currentQuestionIndex === 0)
    ) {
      broadcastSync({
        type: "topic_reveal",
        questionIndex: state.currentQuestionIndex,
        at: Date.now(),
        playlistSig: playlistIdsSignature(state.playlist),
      });
      startSyncPulse();
    }
  }, [broadcastSync, isBotMatch, isSyncLeader, startSyncPulse]);

  const applyMatchSyncState = useCallback(
    async (syncState: MatchSyncState) => {
      if (isBotMatch || isSyncLeader) {
        return;
      }

      const updatedAt = syncState.updatedAt ?? 0;
      if (updatedAt > 0 && updatedAt <= lastAppliedSyncAtRef.current) {
        return;
      }

      const aligned = await ensurePlaylistAligned(syncState.playlistSig);
      if (!aligned) {
        return;
      }

      if (updatedAt > 0) {
        lastAppliedSyncAtRef.current = updatedAt;
      }

      const live = useGameStore.getState();

      if (syncState.phase === "match_finished") {
        clearSyncRequestInterval();
        clearTimers();
        setRoundPhase("match_finished");
        return;
      }

      if (syncState.phase === "playing" && syncState.roundStartedAt) {
        if (
          live.roundPhase === "playing" &&
          live.currentQuestionIndex === syncState.questionIndex &&
          live.roundStartedAt === syncState.roundStartedAt
        ) {
          return;
        }

        clearRoundTimers();
        clearResultTimer();
        setRoundResultSecondsLeft(null);
        resolvingRef.current = false;
        beginRoundPlaying(
          syncState.questionIndex,
          syncState.roundStartedAt,
          true
        );
        return;
      }

      if (syncState.phase === "topic_reveal") {
        if (live.roundPhase === "playing") {
          return;
        }
        if (
          live.roundPhase === "topic_reveal" &&
          live.currentQuestionIndex === syncState.questionIndex
        ) {
          return;
        }
        if (
          live.roundPhase === "round_result" &&
          syncState.questionIndex <= live.currentQuestionIndex
        ) {
          return;
        }
        startTopicReveal(syncState.questionIndex, true);
      }
    },
    [
      beginRoundPlaying,
      clearResultTimer,
      clearRoundTimers,
      clearSyncRequestInterval,
      clearTimers,
      ensurePlaylistAligned,
      isBotMatch,
      isSyncLeader,
      setRoundPhase,
      startTopicReveal,
    ]
  );

  const processSyncPayload = useCallback(
    async (payload: MatchSyncPayload) => {
      if (isBotMatch) {
        return;
      }

      if (
        payload.type === "topic_reveal" ||
        payload.type === "round_playing" ||
        payload.type === "tiebreaker"
      ) {
        const aligned = await ensurePlaylistAligned(payload.playlistSig);
        if (!aligned) {
          return;
        }
      }

      switch (payload.type) {
        case "peer_ready":
          peerReadyRef.current[payload.playerRole] = true;
          maybeStartSyncedMatch();
          break;
        case "request_sync":
          if (isSyncLeader) {
            if (!matchSyncStartedRef.current) {
              maybeStartSyncedMatch();
            } else {
              rebroadcastCurrentState();
            }
          }
          break;
        case "topic_reveal": {
          const live = useGameStore.getState();
          if (live.roundPhase === "playing") {
            break;
          }
          if (
            live.roundPhase === "topic_reveal" &&
            live.currentQuestionIndex === payload.questionIndex
          ) {
            break;
          }
          if (
            live.roundPhase === "round_result" &&
            payload.questionIndex <= live.currentQuestionIndex
          ) {
            break;
          }
          startTopicReveal(payload.questionIndex, true);
          break;
        }
        case "round_playing": {
          clearRoundTimers();
          clearResultTimer();
          setRoundResultSecondsLeft(null);
          resolvingRef.current = false;
          const live = useGameStore.getState();
          if (
            live.roundPhase === "playing" &&
            live.currentQuestionIndex === payload.questionIndex &&
            live.roundStartedAt === payload.startedAt
          ) {
            break;
          }
          beginRoundPlaying(payload.questionIndex, payload.startedAt, true);
          break;
        }
        case "tiebreaker":
          startTiebreakerRound(payload.question);
          break;
        case "match_finished":
          clearSyncRequestInterval();
          clearTimers();
          setRoundPhase("match_finished");
          break;
        default:
          break;
      }
    },
    [
      beginRoundPlaying,
      clearResultTimer,
      clearRoundTimers,
      clearSyncRequestInterval,
      clearTimers,
      ensurePlaylistAligned,
      isBotMatch,
      isSyncLeader,
      maybeStartSyncedMatch,
      rebroadcastCurrentState,
      setRoundPhase,
      startTiebreakerRound,
      startTopicReveal,
    ]
  );

  const drainSyncQueue = useCallback(async () => {
    if (processingSyncQueueRef.current) {
      return;
    }

    processingSyncQueueRef.current = true;

    try {
      while (syncQueueRef.current.length > 0) {
        const payload = syncQueueRef.current.shift();
        if (payload) {
          await processSyncPayload(payload);
        }
      }
    } finally {
      processingSyncQueueRef.current = false;
    }
  }, [processSyncPayload]);

  const enqueueSyncPayload = useCallback(
    (payload: MatchSyncPayload) => {
      if (isBotMatch) {
        return;
      }

      syncQueueRef.current.push(payload);
      void drainSyncQueue();
    },
    [drainSyncQueue, isBotMatch]
  );

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

    if (!isBotMatch && isSyncLeader) {
      persistLeaderSync("round_result", currentQuestionIndex, null);
    }

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
            if (isBotMatch) {
              startTiebreakerRound(result.data);
              return;
            }

            startTiebreakerRound(result.data);
            broadcastSync({
              type: "tiebreaker",
              question: result.data,
              playlistSig: playlistIdsSignature(
                useGameStore.getState().playlist
              ),
            });
            startTopicReveal(
              useGameStore.getState().currentQuestionIndex,
              false
            );
            return;
          }
        }

        advanceToNextRound();

        const afterAdvance = useGameStore.getState();
        if (afterAdvance.roundPhase === "match_finished") {
          broadcastSync({ type: "match_finished" });
          persistLeaderSync(
            "match_finished",
            afterAdvance.currentQuestionIndex,
            null
          );
          return;
        }

        startTopicReveal(afterAdvance.currentQuestionIndex, false);
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
    broadcastSync,
    clearResultTimer,
    clearTimers,
    currentQuestionIndex,
    isBotMatch,
    isSyncLeader,
    persistLeaderSync,
    play,
    resolveRound,
    setRoundPhase,
    startTiebreakerRound,
    startTopicReveal,
  ]);

  const finalizeRoundRef = useRef(finalizeRound);
  finalizeRoundRef.current = finalizeRound;

  const applyMatchSyncStateRef = useRef(applyMatchSyncState);
  applyMatchSyncStateRef.current = applyMatchSyncState;

  const enqueueSyncPayloadRef = useRef(enqueueSyncPayload);
  enqueueSyncPayloadRef.current = enqueueSyncPayload;

  const maybeStartSyncedMatchRef = useRef(maybeStartSyncedMatch);
  maybeStartSyncedMatchRef.current = maybeStartSyncedMatch;

  const rebroadcastCurrentStateRef = useRef(rebroadcastCurrentState);
  rebroadcastCurrentStateRef.current = rebroadcastCurrentState;

  const startTopicRevealRef = useRef(startTopicReveal);
  startTopicRevealRef.current = startTopicReveal;

  const flushPendingBroadcastsRef = useRef(flushPendingBroadcasts);
  flushPendingBroadcastsRef.current = flushPendingBroadcasts;

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
    if (isBotMatch) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await loadServerPlaylist();
      if (cancelled || !result.success) {
        return;
      }

      if (!isSyncLeader && result.data.matchSync) {
        await applyMatchSyncStateRef.current(result.data.matchSync);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isBotMatch, isSyncLeader, loadServerPlaylist, sessionId]);

  useEffect(() => {
    if (isBotMatch || isSyncLeader) {
      return;
    }

    const dbChannel = supabase
      .channel(`match-sync-db-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const matchSync = (payload.new as { match_sync?: unknown }).match_sync;
          if (isMatchSyncState(matchSync)) {
            void applyMatchSyncStateRef.current(matchSync);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
    };
  }, [isBotMatch, isSyncLeader, sessionId, supabase]);

  useEffect(() => {
    if (isBotMatch) {
      channelReadyRef.current = true;
      setChannelReady(true);
      return;
    }

    channelReadyRef.current = false;
    setChannelReady(false);
    pendingBroadcastsRef.current = [];
    peerReadyRef.current = { a: false, b: false };
    matchSyncStartedRef.current = false;
    lastRoundPlayingRef.current = null;

    const channel = supabase.channel(`game_session:${sessionId}`, {
      config: {
        broadcast: {
          self: false,
        },
        presence: {
          key: localUserId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const roles = countPresentPlayers(channel.presenceState());
        peerReadyRef.current.a = roles.has("a");
        peerReadyRef.current.b = roles.has("b");
        maybeStartSyncedMatchRef.current();

        if (isSyncLeaderRef.current && matchSyncStartedRef.current) {
          rebroadcastCurrentStateRef.current();
        }
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
      .on("broadcast", { event: MATCH_SYNC_EVENT }, ({ payload }) => {
        if (isMatchSyncPayload(payload)) {
          enqueueSyncPayloadRef.current(payload);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
          channelReadyRef.current = true;
          setChannelReady(true);
          flushPendingBroadcastsRef.current();

          await channel.track({ playerRole: localPlayerRole });

          peerReadyRef.current[localPlayerRole] = true;
          broadcastSyncRef.current({
            type: "peer_ready",
            playerRole: localPlayerRole,
          });
          maybeStartSyncedMatchRef.current();

          if (isSyncLeaderRef.current) {
            clearMatchStartFallback();
            matchStartFallbackRef.current = window.setTimeout(() => {
              if (!matchSyncStartedRef.current) {
                peerReadyRef.current.a = true;
                peerReadyRef.current.b = true;
                matchSyncStartedRef.current = true;
                startTopicRevealRef.current(0, false);
              }
            }, MATCH_START_FALLBACK_MS);
          } else {
            clearSyncRequestInterval();
            broadcastSyncRef.current({ type: "request_sync" });
            syncRequestIntervalRef.current = window.setInterval(() => {
              const phase = useGameStore.getState().roundPhase;
              if (phase === "match_finished") {
                clearSyncRequestInterval();
                return;
              }
              broadcastSyncRef.current({ type: "request_sync" });
              void loadServerPlaylist().then((result) => {
                if (result.success && result.data.matchSync) {
                  void applyMatchSyncStateRef.current(result.data.matchSync);
                }
              });
            }, SYNC_REQUEST_INTERVAL_MS);
          }
        }
      });

    return () => {
      clearMatchStartFallback();
      clearSyncRequestInterval();
      clearSyncPulse();
      supabase.removeChannel(channel);
      channelRef.current = null;
      channelReadyRef.current = false;
      pendingBroadcastsRef.current = [];
    };
  }, [
    clearMatchStartFallback,
    clearSyncPulse,
    clearSyncRequestInterval,
    countPresentPlayers,
    isBotMatch,
    localPlayerRole,
    localUserId,
    sessionId,
    supabase,
  ]);

  useEffect(() => {
    if (isBotMatch) {
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
          beginRoundPlaying(currentQuestionIndex, Date.now(), true);
        }, TOPIC_REVEAL_MS);
      }

      if (roundPhase === "playing" && roundStartedAt) {
        scheduleBotAnswer();
        startRoundTimer();
      }

      return clearRoundTimers;
    }

    if (roundPhase === "playing" && roundStartedAt) {
      scheduleBotAnswer();
      startRoundTimer();
    }
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
  }, [
    finalizeRound,
    playerAAnswer,
    playerBAnswer,
    roundPhase,
  ]);

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
