"use client";

import { useCallback, useEffect, useRef } from "react";
import { getMatchSession } from "@/app/dashboard/matchmaking/actions";
import {
  estimateClockOffsetMs,
  publishMatchSync,
} from "@/lib/match-sync-client";
import { createClient } from "@/utils/supabase/client";
import {
  MATCH_SYNC_VERSION,
  isMatchAnswerRecord,
  type MatchAnswerRecord,
  type MatchSyncState,
} from "@/lib/match-sync";
import { parseQuestionPlaylist } from "@/lib/session-playlist";
import { determineWinner } from "@/lib/scoring";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useGameStore, type LockedAnswer } from "@/store/useGameStore";
import type { QuestionActive } from "@/types/database.types";

const POLL_MS = 300;
const LEADER_START_RETRY_MS = 600;
const WRITE_ATTEMPTS = 3;

type UseServerMatchSyncOptions = {
  sessionId: string;
  isLeader: boolean;
  serverPlaylist: QuestionActive[];
  enabled: boolean;
  /** Called whenever a round enters the "playing" phase. */
  onEnterPlaying: () => void;
  /** Called right before a new round is applied (clear timers/flags). */
  onNewRound: () => void;
  /** Both locked answers are visible locally (poll/broadcast path). */
  onBothAnswersLocked: () => void;
};

/**
 * PvP match sync. The database row is the single source of truth.
 *
 * TRANSPORT (v6): polls, answer writes, AND host round-publish all go
 * browser → Supabase. Nothing in the hot loop uses a Next.js server action —
 * one tab's actions run serially, so a report submit or a leftover action
 * queued for minutes and blocked `updateMatchSyncState` between questions.
 * Round timestamps come from the Postgres `get_server_time_ms()` RPC.
 * A realtime postgres_changes subscription triggers an immediate extra poll.
 *
 * CLOCKS: clients estimate offset to the Postgres clock at match start and
 * only compare server timestamps against that estimate.
 *
 * The question index is monotonic: clients never move backwards, and a client
 * already showing the round result for the current index is never yanked back.
 */
export function useServerMatchSync({
  sessionId,
  isLeader,
  serverPlaylist,
  enabled,
  onEnterPlaying,
  onNewRound,
  onBothAnswersLocked,
}: UseServerMatchSyncOptions) {
  const { play } = useGameAudio();

  const playRef = useRef(play);
  playRef.current = play;
  const onEnterPlayingRef = useRef(onEnterPlaying);
  onEnterPlayingRef.current = onEnterPlaying;
  const onNewRoundRef = useRef(onNewRound);
  onNewRoundRef.current = onNewRound;
  const onBothAnswersLockedRef = useRef(onBothAnswersLocked);
  onBothAnswersLockedRef.current = onBothAnswersLocked;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const isLeaderRef = useRef(isLeader);
  isLeaderRef.current = isLeader;

  const flipTimerRef = useRef<number | null>(null);
  const matchStartedRef = useRef(false);
  const startingRef = useRef(false);
  const refreshingPlaylistRef = useRef(false);
  const initializedSessionRef = useRef<string | null>(null);
  const supabaseRef = useRef(createClient());
  /** localClock + clockOffset ≈ serverClock. null until estimated. */
  const clockOffsetRef = useRef<number | null>(null);

  const clearFlipTimer = useCallback(() => {
    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
  }, []);

  /**
   * Flip topic reveal → playing for the given round, if still relevant.
   * `localRoundStartedAt` is the round start instant already converted to the
   * local clock (used for the countdown and response times).
   */
  const enterPlaying = useCallback(
    (questionIndex: number, localRoundStartedAt: number) => {
      const live = useGameStore.getState();
      if (live.currentQuestionIndex !== questionIndex) {
        return;
      }
      if (live.roundPhase !== "topic_reveal" && live.roundPhase !== "waiting") {
        return;
      }

      useGameStore.setState({
        roundPhase: "playing",
        roundStartedAt: localRoundStartedAt,
      });
      onEnterPlayingRef.current();
    },
    []
  );

  /** Tiebreaker question was appended server-side; refetch the playlist. */
  const refreshPlaylist = useCallback(async () => {
    if (refreshingPlaylistRef.current) {
      return;
    }
    refreshingPlaylistRef.current = true;
    try {
      const result = await getMatchSession(sessionIdRef.current);
      if (result.success && result.data.playlist.length > 0) {
        useGameStore.setState({ playlist: result.data.playlist });
      }
    } finally {
      refreshingPlaylistRef.current = false;
    }
  }, []);

  const applySync = useCallback(
    (sync: MatchSyncState, serverNow: number) => {
      const live = useGameStore.getState();

      if (sync.phase === "match_finished") {
        if (live.roundPhase !== "match_finished") {
          clearFlipTimer();
          useGameStore.setState({
            roundPhase: "match_finished",
            status: "finished",
            matchWinner:
              live.matchWinner ??
              determineWinner(
                live.playerAScore,
                live.playerBScore,
                live.playerAResponseTimes,
                live.playerBResponseTimes
              ),
          });
        }
        return;
      }

      // Monotonic guard: never move backwards (stale in-flight responses).
      if (sync.questionIndex < live.currentQuestionIndex) {
        return;
      }

      if (live.playlist.length === 0) {
        return;
      }

      // Index beyond our playlist → tiebreaker question we haven't fetched.
      if (sync.questionIndex >= live.playlist.length) {
        void refreshPlaylist();
        return;
      }

      // Server-clock vs server-clock comparison. Device clocks are NEVER
      // compared against another device's clock (that froze skewed devices).
      const playingDue = serverNow >= sync.roundStartedAt;
      const msUntilPlaying = Math.max(0, sync.roundStartedAt - serverNow);
      // The same instant expressed on this device's clock, for the local
      // countdown and response-time measurements.
      const localRoundStartedAt =
        Date.now() + (sync.roundStartedAt - serverNow);

      const isNewRound =
        sync.questionIndex > live.currentQuestionIndex ||
        live.roundPhase === "waiting";

      if (isNewRound) {
        console.log(
          `[match-sync ${MATCH_SYNC_VERSION}] round ${sync.questionIndex} (${
            playingDue ? "playing" : `topic, flip in ${msUntilPlaying}ms`
          })`
        );
        onNewRoundRef.current();
        clearFlipTimer();

        useGameStore.setState({
          currentQuestionIndex: sync.questionIndex,
          roundPhase: playingDue ? "playing" : "topic_reveal",
          playerAAnswer: null,
          playerBAnswer: null,
          roundStartedAt: playingDue ? localRoundStartedAt : null,
          timeRemaining: 25,
          lastRoundPointsA: 0,
          lastRoundPointsB: 0,
        });
        playRef.current("reveal");

        if (playingDue) {
          onEnterPlayingRef.current();
        } else {
          flipTimerRef.current = window.setTimeout(
            () => enterPlaying(sync.questionIndex, localRoundStartedAt),
            msUntilPlaying
          );
        }
        return;
      }

      // Same round. If we've already resolved it locally, leave it alone —
      // the next round arrives via a higher questionIndex.
      if (
        live.roundPhase === "round_result" ||
        live.roundPhase === "match_finished" ||
        live.roundPhase === "tiebreaker_loading"
      ) {
        return;
      }

      if (live.roundPhase === "topic_reveal") {
        if (playingDue) {
          clearFlipTimer();
          enterPlaying(sync.questionIndex, localRoundStartedAt);
        } else if (flipTimerRef.current === null) {
          flipTimerRef.current = window.setTimeout(
            () => enterPlaying(sync.questionIndex, localRoundStartedAt),
            msUntilPlaying
          );
        }
      }
      // Already playing: never touch state (answers may be in flight).
    },
    [clearFlipTimer, enterPlaying, refreshPlaylist]
  );

  /**
   * Reliable answer path: lock any answer the poll returned that belongs to
   * the current round and isn't locked locally yet. The realtime broadcast
   * usually arrives first; this catches every answer a broadcast dropped, so
   * the round resolves within one poll instead of stalling until the 25s
   * timeout.
   */
  const applyRemoteAnswers = useCallback(
    (answerA: MatchAnswerRecord | null, answerB: MatchAnswerRecord | null) => {
      const live = useGameStore.getState();

      if (live.roundPhase !== "playing" && live.roundPhase !== "topic_reveal") {
        return;
      }

      const patch: {
        playerAAnswer?: LockedAnswer;
        playerBAnswer?: LockedAnswer;
      } = {};

      if (
        answerA &&
        answerA.questionIndex === live.currentQuestionIndex &&
        !live.playerAAnswer
      ) {
        patch.playerAAnswer = {
          answer: answerA.answer,
          responseTimeMs: answerA.responseTimeMs,
        };
      }

      if (
        answerB &&
        answerB.questionIndex === live.currentQuestionIndex &&
        !live.playerBAnswer
      ) {
        patch.playerBAnswer = {
          answer: answerB.answer,
          responseTimeMs: answerB.responseTimeMs,
        };
      }

      if (!patch.playerAAnswer && !patch.playerBAnswer) {
        return;
      }

      useGameStore.setState(patch);

      const updated = useGameStore.getState();
      if (updated.playerAAnswer && updated.playerBAnswer) {
        onBothAnswersLockedRef.current();
      }
    },
    []
  );

  /**
   * Host: publish a round. The write goes out first so the SERVER stamps the
   * shared start instant; the host then applies the exact record the opponent
   * will see via polling. Both devices therefore flip to the question at the
   * same server-clock moment, regardless of their own clock settings.
   */
  const leaderStartRound = useCallback(
    async (questionIndex: number, appendQuestionId?: string) => {
      if (!isLeaderRef.current) {
        return false;
      }

      for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt += 1) {
        const result = await publishMatchSync(
          supabaseRef.current,
          sessionIdRef.current,
          { questionIndex, phase: "round", appendQuestionId }
        );
        if (result.success) {
          applySync(result.sync, result.serverNow);
          return true;
        }
        console.error(
          `[match-sync] round publish failed (attempt ${attempt}): ${result.error}`
        );
      }

      return false;
    },
    [applySync]
  );

  const leaderFinishMatch = useCallback(async () => {
    if (!isLeaderRef.current) {
      return false;
    }

    clearFlipTimer();
    const questionIndex = useGameStore.getState().currentQuestionIndex;

    for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt += 1) {
      const result = await publishMatchSync(
        supabaseRef.current,
        sessionIdRef.current,
        { questionIndex, phase: "match_finished" }
      );
      if (result.success) {
        applySync(result.sync, result.serverNow);
        return true;
      }
      console.error(
        `[match-sync] finish publish failed (attempt ${attempt}): ${result.error}`
      );
    }

    return false;
  }, [applySync, clearFlipTimer]);

  /** Host: start round 0 once the opponent has joined the session row. */
  const ensureMatchStarted = useCallback(async () => {
    if (!isLeaderRef.current || matchStartedRef.current || startingRef.current) {
      return;
    }

    startingRef.current = true;
    try {
      const { data: session, error } = await supabaseRef.current
        .from("game_sessions")
        .select("status, player_b_id, question_playlist")
        .eq("id", sessionIdRef.current)
        .maybeSingle();

      if (error || !session) {
        return;
      }

      const { sync } = parseQuestionPlaylist(session.question_playlist);
      if (sync) {
        // Already started (e.g. host refreshed) — the poll loop resumes it.
        matchStartedRef.current = true;
        return;
      }

      if (!session.player_b_id || session.status !== "active") {
        return;
      }

      matchStartedRef.current = true;
      await leaderStartRound(0);
    } finally {
      startingRef.current = false;
    }
  }, [leaderStartRound]);

  // Authoritative playlist + clean slate, exactly once per session id.
  useEffect(() => {
    if (!enabled || serverPlaylist.length === 0) {
      return;
    }

    if (initializedSessionRef.current === sessionId) {
      useGameStore.setState({ playlist: serverPlaylist });
      return;
    }

    initializedSessionRef.current = sessionId;
    console.log(
      `[match-sync ${MATCH_SYNC_VERSION}] init session=${sessionId} leader=${isLeader}`
    );

    useGameStore.setState({
      gameSessionId: sessionId,
      playlist: serverPlaylist,
      currentQuestionIndex: 0,
      roundPhase: "waiting",
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
  }, [enabled, isLeader, serverPlaylist, sessionId]);

  // Estimate the offset between this device's clock and the server clock
  // that stamps roundStartedAt. Min-RTT sample wins; runs once per session.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const estimate = async () => {
      const offset = await estimateClockOffsetMs(supabaseRef.current);
      if (!cancelled) {
        clockOffsetRef.current = offset;
      }
    };

    void estimate();

    return () => {
      cancelled = true;
    };
  }, [enabled, sessionId]);

  // Both players poll the database — single source of truth. This reads
  // Supabase DIRECTLY (never a server action — see the header comment).
  // A realtime subscription on the row triggers an immediate extra tick so
  // round changes and answers usually land well under the poll interval.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = supabaseRef.current;
    let cancelled = false;
    let loggedFailure = false;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) {
        return;
      }
      inFlight = true;

      try {
        const { data: session, error } = await supabase
          .from("game_sessions")
          .select("question_playlist, answer_a, answer_b")
          .eq("id", sessionIdRef.current)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (error || !session) {
          if (!loggedFailure) {
            loggedFailure = true;
            console.error(
              `[match-sync] poll failed: ${error?.message ?? "session not found"}`
            );
          }
          return;
        }

        loggedFailure = false;

        const { sync } = parseQuestionPlaylist(session.question_playlist);
        const clockOffset = clockOffsetRef.current;

        // Until the clock offset is estimated (sub-second at mount) we cannot
        // place server timestamps on the local clock — skip, not guess.
        if (sync && clockOffset !== null) {
          applySync(sync, Date.now() + clockOffset);
        }

        applyRemoteAnswers(
          isMatchAnswerRecord(session.answer_a) ? session.answer_a : null,
          isMatchAnswerRecord(session.answer_b) ? session.answer_b : null
        );
      } catch {
        // Transient network error — next poll retries.
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, POLL_MS);

    const channel = supabase
      .channel(`match-sync-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`,
        },
        () => {
          void tick();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
      clearFlipTimer();
    };
  }, [applyRemoteAnswers, applySync, clearFlipTimer, enabled, sessionId]);

  // Host kicks off round 0 as soon as the opponent appears in the row.
  useEffect(() => {
    if (!enabled || !isLeader) {
      return;
    }

    void ensureMatchStarted();
    const interval = window.setInterval(() => {
      void ensureMatchStarted();
    }, LEADER_START_RETRY_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, ensureMatchStarted, isLeader, sessionId]);

  return {
    leaderStartRound,
    leaderFinishMatch,
  };
}
