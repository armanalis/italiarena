"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { exitCountsAsLoss } from "@/lib/exit-match";
import { createClient } from "@/utils/supabase/client";
import {
  isOpponentMissing,
  shouldCheckSilentOpponent,
} from "@/lib/match-score-state";
import {
  requestTiebreakerQuestion,
  resolveMatchRoundServer,
  revealRoundAnswer,
  type RoundReveal,
} from "@/lib/match-sync-client";
import { pulseCountdownHaptic } from "@/lib/haptics";
import { getRoundTimeRemainingSec } from "@/lib/match-timer";
import { getRoundResultMs } from "@/lib/match-timing";
import { useBotMatch } from "@/hooks/useBotMatch";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useServerMatchSync } from "@/hooks/useServerMatchSync";
import { useGameStore } from "@/store/useGameStore";
import { REGULAR_MATCH_QUESTIONS, shouldStartTiebreaker } from "@/lib/match";
import { isAnswerCorrect } from "@/lib/scoring";
import type { CorrectAnswer, PublicQuestion } from "@/types/database.types";
import type { ProficiencyLevel } from "@/lib/constants";

const ROUND_RESULT_TICK_MS = 100;
/** ~3 s of reveal retries while the opponent's answer is still being saved. */
const OPPONENT_SAVE_ATTEMPTS = 5;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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
  serverPlaylist: PublicQuestion[];
};

/**
 * The round loop both kinds of match share: the question clock, locking and
 * saving an answer, the reveal, the result screen. What moves a match from
 * round to round lives elsewhere: useBotMatch for a bot, and for a real
 * opponent the host's server rounds (useServerMatchSync) plus the code here.
 */
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
  const setTimeRemaining = useGameStore((state) => state.setTimeRemaining);
  const lockLocalAnswer = useGameStore((state) => state.lockLocalAnswer);
  const lockOpponentAnswer = useGameStore((state) => state.lockOpponentAnswer);
  const resolveRound = useGameStore((state) => state.resolveRound);
  const advanceToNextRound = useGameStore((state) => state.advanceToNextRound);
  const setRoundPhase = useGameStore((state) => state.setRoundPhase);

  const resultTimerRef = useRef<number | null>(null);
  const roundTimerRef = useRef<number | null>(null);
  /** Filled in below, once the round loop it needs exists. */
  const botRef = useRef<ReturnType<typeof useBotMatch> | null>(null);
  const resolvingRef = useRef(false);
  const resultRemainingMsRef = useRef(0);
  /** Host: round index we are trying to publish after the result screen. */
  const pendingNextRoundRef = useRef<number | null>(null);
  /** This client's in-flight answer write; the reveal waits for it to land. */
  const answerWriteRef = useRef<{
    questionIndex: number;
    promise: Promise<void>;
  } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelReadyRef = useRef(false);
  const pendingBroadcastsRef = useRef<AnswerLockedPayload[]>([]);
  const [roundResultSecondsLeft, setRoundResultSecondsLeft] = useState<
    number | null
  >(null);

  const clearRoundTimer = useCallback(() => {
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

  const clearTimers = useCallback(() => {
    clearRoundTimer();
    clearResultTimer();
    botRef.current?.clearBotTimers();
  }, [clearResultTimer, clearRoundTimer]);

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
      // Never ready in a bot match: there is no one to tell.
      if (!channelReadyRef.current) {
        pendingBroadcastsRef.current.push(payload);
        return;
      }

      void channelRef.current?.send({
        type: "broadcast",
        event: "answer_locked",
        payload,
      });
    },
    []
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
   * answer column.
   */
  const persistAnswer = useCallback(
    async (payload: {
      questionIndex: number;
      answer: CorrectAnswer | null;
      responseTimeMs: number | null;
    }) => {
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

        // Already locked (e.g. a retry whose first write did land): the
        // server's copy is final, and the reveal reports it back.
        if (!error || error.message.includes("already locked")) {
          return;
        }
        console.error(
          `[match-sync] answer write failed (attempt ${attempt}): ${error.message}`
        );
      }
    },
    [sessionId, supabase]
  );

  /** Lock this player's answer locally and start the server write. */
  const submitLocalAnswer = useCallback(
    (questionIndex: number, answer: CorrectAnswer | null, responseTimeMs: number | null) => {
      answerWriteRef.current = {
        questionIndex,
        promise: persistAnswer({ questionIndex, answer, responseTimeMs }),
      };
    },
    [persistAnswer]
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
      const remaining = getRoundTimeRemainingSec(startedAt);

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
          submitLocalAnswer(state.currentQuestionIndex, null, null);
        }

        botRef.current?.roundTimeUp();

        finalizeRoundRef.current();
      }
    }, 250);
  }, [
    broadcastAnswer,
    lockLocalAnswer,
    setTimeRemaining,
    submitLocalAnswer,
  ]);

  const handleNewSyncRound = useCallback(() => {
    // A new round arrived from the server: drop all timers and per-round
    // flags so a stale result countdown can't block the next finalize.
    clearTimers();
    resolvingRef.current = false;
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

      if (isBotMatch) {
        await botRef.current?.advanceAfterResult();
        return;
      }

      // A real match moves on when the host publishes the next round.
      if (!isSyncLeader) {
        return;
      }

      // Rounds score strictly in order, so a round the opponent never
      // answered (they left) would block every later round and the result.
      // The server scores it once both answers are in or its clock ran out.
      const roundIndex = useGameStore.getState().currentQuestionIndex;
      for (;;) {
        const resolved = await resolveMatchRoundServer(supabase, sessionId, roundIndex);
        if (resolved.success || !resolved.error.includes("Round is still open")) {
          break;
        }
        if (useGameStore.getState().roundPhase !== "round_result") {
          return;
        }
        await wait(1_000);
      }

      // The opponent never answered this round, not even "timed out": they
      // may be gone. Wait for them instead of playing on alone; if they stay
      // silent, the silent-opponent check below ends the match.
      for (;;) {
        const live = useGameStore.getState();
        if (live.roundPhase !== "round_result") {
          return;
        }
        if (!isOpponentMissing(live)) {
          break;
        }
        await wait(1_000);
      }

      const latest = useGameStore.getState();
      // Meanwhile the last round's score may have finished the match, or the
      // opponent may have left.
      if (latest.roundPhase !== "round_result") {
        return;
      }

      // Sudden-death: tied after the 10 regular questions → one extra round.
      if (shouldStartTiebreaker(latest)) {
        setRoundPhase("tiebreaker_loading");

        const tiebreaker = await requestTiebreakerQuestion(supabase, sessionId);
        if (tiebreaker) {
          // Append locally so the host playlist covers Q11, but stay on
          // tiebreaker_loading until publish/applySync advances BOTH clients
          // from the same server-stamped round record.
          useGameStore.setState((state) => ({
            playlist: state.playlist.some(
              (question) => question.id === tiebreaker.id
            )
              ? state.playlist
              : [...state.playlist, tiebreaker],
            tiebreakerQuestion: tiebreaker,
            tiebreakerUsed: true,
            roundPhase: "tiebreaker_loading",
          }));

          const tiebreakerIndex = REGULAR_MATCH_QUESTIONS;
          pendingNextRoundRef.current = tiebreakerIndex;
          const published = await leaderStartRoundRef.current(tiebreakerIndex);
          if (published) {
            pendingNextRoundRef.current = null;
          }
          return;
        }
      }

      const nextIndex = latest.currentQuestionIndex + 1;
      if (nextIndex >= latest.playlist.length) {
        pendingNextRoundRef.current = null;
        advanceToNextRound();
        void leaderFinishMatchRef.current();
        return;
      }

      pendingNextRoundRef.current = nextIndex;
      const published = await leaderStartRoundRef.current(nextIndex);
      if (published) {
        pendingNextRoundRef.current = null;
      }
    })();
  }, [
    advanceToNextRound,
    isBotMatch,
    isSyncLeader,
    sessionId,
    setRoundPhase,
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
    clearRoundTimer();
    scheduleRoundResultCountdown();
  }, [clearRoundTimer, scheduleRoundResultCountdown]);

  const serverSync = useServerMatchSync({
    sessionId,
    isLeader: isSyncLeader,
    localPlayerRole,
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

  /**
   * Ask the server for this round's answer. It is only revealed once our own
   * answer is locked there, so wait for that write first. Retries until it
   * works or the match has moved past this round; null means "moved on".
   */
  const fetchRoundReveal = useCallback(
    async (questionIndex: number): Promise<RoundReveal | null> => {
      for (let attempt = 1; ; attempt += 1) {
        const pending = answerWriteRef.current;
        if (pending?.questionIndex === questionIndex) {
          await pending.promise;
        }

        const live = useGameStore.getState();
        if (
          live.currentQuestionIndex !== questionIndex ||
          live.roundPhase !== "playing"
        ) {
          return null;
        }

        const result = await revealRoundAnswer(supabase, sessionId, questionIndex);
        if (result.success) {
          // The opponent's "answered" broadcast is sent before their answer is
          // saved, so it can beat the save here. Scoring now would count them
          // as not answering: ask again for a moment.
          const now = useGameStore.getState();
          const opponent = now.localPlayerRole === "a" ? now.playerBAnswer : now.playerAAnswer;
          const opponentStillSaving =
            !isBotMatch && opponent?.responseTimeMs != null && result.data.opponentAnswer === null;
          if (!opponentStillSaving || attempt >= OPPONENT_SAVE_ATTEMPTS) {
            return result.data;
          }
        } else {
          console.error(`[match] reveal failed (attempt ${attempt}): ${result.error}`);

          // Our write never landed (dropped request, or a refresh lost it):
          // lock what this screen shows, then ask again.
          if (result.error.includes("Answer this round first")) {
            const local =
              live.localPlayerRole === "a" ? live.playerAAnswer : live.playerBAnswer;
            submitLocalAnswer(
              questionIndex,
              local?.answer ?? null,
              local?.responseTimeMs ?? null
            );
          }
        }

        await wait(Math.min(2_000, 300 * attempt));
      }
    },
    [isBotMatch, sessionId, submitLocalAnswer, supabase]
  );

  const finalizeRound = useCallback(() => {
    if (resolvingRef.current) {
      return;
    }

    resolvingRef.current = true;
    clearTimers();

    const questionIndex = useGameStore.getState().currentQuestionIndex;

    void (async () => {
      const reveal = await fetchRoundReveal(questionIndex);
      const live = useGameStore.getState();
      // The match may have moved on while the reveal was in flight; never
      // score a newer round with this round's answer.
      if (
        !reveal ||
        live.currentQuestionIndex !== questionIndex ||
        live.roundPhase !== "playing"
      ) {
        return;
      }

      const localKey = live.localPlayerRole === "a" ? "playerAAnswer" : "playerBAnswer";
      const opponentKey = live.localPlayerRole === "a" ? "playerBAnswer" : "playerAAnswer";
      const local = live[localKey];
      const opponent = live[opponentKey];

      // The server's copy of our answer is the one that counts (it differs
      // only if a refresh made us answer twice).
      const patch: Partial<Pick<typeof live, "playerAAnswer" | "playerBAnswer">> = {};
      if (reveal.selectedAnswer !== (local?.answer ?? null)) {
        patch[localKey] = {
          answer: reveal.selectedAnswer,
          responseTimeMs: reveal.selectedResponseTimeMs,
        };
      }
      // The opponent's pick stays on the server until ours is locked (a bot's
      // is decided there); fill it in now. An opponent that never locked
      // (responseTimeMs null) timed out.
      if (opponent?.responseTimeMs != null) {
        patch[opponentKey] = {
          answer: isBotMatch ? reveal.botAnswer : reveal.opponentAnswer,
          responseTimeMs: opponent.responseTimeMs,
        };
      }
      if (Object.keys(patch).length > 0) {
        useGameStore.setState(patch);
      }

      play(
        isAnswerCorrect(reveal.selectedAnswer, reveal.correctAnswer)
          ? "correct"
          : "incorrect"
      );

      resolveRound(reveal.correctAnswer);
      void botRef.current?.persistScores();
      scheduleRoundResultCountdown();
    })();
  }, [
    clearTimers,
    fetchRoundReveal,
    isBotMatch,
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
        Date.now() - state.roundStartedAt
      );
      lockLocalAnswer(answer, responseTimeMs);

      // "Answered" only: the letter stays hidden until the opponent locks too.
      broadcastAnswer({
        playerRole: state.localPlayerRole!,
        questionIndex: state.currentQuestionIndex,
        answer: null,
        responseTimeMs,
      });
      submitLocalAnswer(state.currentQuestionIndex, answer, responseTimeMs);

      if (bothAnswersLocked()) {
        finalizeRound();
      }
    },
    [
      bothAnswersLocked,
      broadcastAnswer,
      finalizeRound,
      lockLocalAnswer,
      play,
      submitLocalAnswer,
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

  const bot = useBotMatch({
    enabled: isBotMatch,
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
  });
  botRef.current = bot;

  useEffect(() => {
    if (isBotMatch) {
      return;
    }

    channelReadyRef.current = false;
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
    if (!isBotMatch && roundPhase === "playing" && roundStartedAt) {
      startRoundTimer();
    }
  }, [isBotMatch, roundPhase, roundStartedAt, startRoundTimer]);

  useEffect(() => {
    if (roundPhase !== "playing") {
      return;
    }

    if (playerAAnswer && playerBAnswer) {
      finalizeRound();
    }
  }, [finalizeRound, playerAAnswer, playerBAnswer, roundPhase]);

  // An opponent who goes silent (closed the tab, lost connection) must not
  // leave this player waiting. Once the screen has waited a while with
  // nothing happening, ask the server: it checks who went silent and, if it
  // is the opponent, ends the match as their forfeit (claim_silent_opponent:
  // 5 s after the question clock, or 10 s after a scored round).
  useEffect(() => {
    if (isBotMatch) {
      return;
    }

    let lastSignature = "";
    let lastProgressAt = Date.now();
    let lastClaimAt = 0;

    const interval = window.setInterval(() => {
      const live = useGameStore.getState();
      const now = Date.now();
      const signature = [
        live.currentQuestionIndex,
        live.roundPhase,
        Boolean(live.playerAAnswer),
        Boolean(live.playerBAnswer),
      ].join(":");

      if (signature !== lastSignature) {
        lastSignature = signature;
        lastProgressAt = now;
        return;
      }

      if (
        !shouldCheckSilentOpponent({
          roundPhase: live.roundPhase,
          finished: live.status === "finished",
          stalledMs: now - lastProgressAt,
          sinceLastCheckMs: now - lastClaimAt,
        })
      ) {
        return;
      }

      lastClaimAt = now;
      // Refused until the server agrees the opponent is silent; on success the
      // sync poll sees the ended match. (`.then` is what sends the request.)
      void supabase
        .rpc("claim_silent_opponent", { p_session_id: sessionId })
        .then(() => undefined);
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isBotMatch, sessionId, supabase]);

  // Closing the tab after a scored round counts as leaving (the opponent's app
  // ends the match), so let the browser ask first, like the header's Dashboard
  // link does. Browsers cannot tell a reload apart, so a reload asks too.
  useEffect(() => {
    if (isBotMatch) {
      return;
    }

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (exitCountsAsLoss()) {
        event.preventDefault();
        // Older Chrome and Edge only ask when returnValue is set.
        event.returnValue = true;
      }
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
    };
  }, [isBotMatch]);

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
        return;
      }

      void leaderStartRoundRef.current(pending).then((published) => {
        if (published) {
          pendingNextRoundRef.current = null;
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
    matchClosed: serverSync.matchClosed,
  };
}
