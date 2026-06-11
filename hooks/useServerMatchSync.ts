"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  getMatchSyncState,
  updateMatchSyncState,
} from "@/app/dashboard/match/sync-actions";
import { getMatchSession } from "@/app/dashboard/matchmaking/actions";
import { MATCH_SYNC_VERSION, type MatchSyncState } from "@/lib/match-sync";
import { determineWinner } from "@/lib/scoring";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useGameStore } from "@/store/useGameStore";
import type { QuestionActive } from "@/types/database.types";

const TOPIC_REVEAL_MS = 750;
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
};

/**
 * PvP match sync. The database row is the single source of truth.
 *
 * The host writes ONE sync record per round: `{ questionIndex, "round",
 * roundStartedAt }` where `roundStartedAt` is the wall-clock moment the
 * question becomes answerable. Every client (host included) derives the
 * visible phase from its own clock: before `roundStartedAt` it shows the
 * topic reveal, after it the question. Each 300ms poll re-derives the phase,
 * so even if every local timer dies the client converges within one poll —
 * it is impossible to stay stuck on the topic screen while polling works.
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
}: UseServerMatchSyncOptions) {
  const { play } = useGameAudio();

  const playRef = useRef(play);
  playRef.current = play;
  const onEnterPlayingRef = useRef(onEnterPlaying);
  onEnterPlayingRef.current = onEnterPlaying;
  const onNewRoundRef = useRef(onNewRound);
  onNewRoundRef.current = onNewRound;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const isLeaderRef = useRef(isLeader);
  isLeaderRef.current = isLeader;

  const flipTimerRef = useRef<number | null>(null);
  const matchStartedRef = useRef(false);
  const startingRef = useRef(false);
  const refreshingPlaylistRef = useRef(false);
  const initializedSessionRef = useRef<string | null>(null);

  const clearFlipTimer = useCallback(() => {
    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
  }, []);

  /** Flip topic reveal → playing for the given round, if still relevant. */
  const enterPlaying = useCallback((questionIndex: number, roundStartedAt: number) => {
    const live = useGameStore.getState();
    if (live.currentQuestionIndex !== questionIndex) {
      return;
    }
    if (
      live.roundPhase === "round_result" ||
      live.roundPhase === "match_finished"
    ) {
      return;
    }
    if (live.roundPhase === "playing" && live.roundStartedAt === roundStartedAt) {
      return;
    }

    useGameStore.setState({
      roundPhase: "playing",
      roundStartedAt,
    });
    onEnterPlayingRef.current();
  }, []);

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
    (sync: MatchSyncState) => {
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

      const now = Date.now();
      const playingDue = now >= sync.roundStartedAt;
      const isNewRound =
        sync.questionIndex > live.currentQuestionIndex ||
        live.roundPhase === "waiting";

      if (isNewRound) {
        console.log(
          `[match-sync ${MATCH_SYNC_VERSION}] round ${sync.questionIndex} (${
            playingDue ? "playing" : "topic"
          })`
        );
        onNewRoundRef.current();
        clearFlipTimer();

        useGameStore.setState({
          currentQuestionIndex: sync.questionIndex,
          roundPhase: playingDue ? "playing" : "topic_reveal",
          playerAAnswer: null,
          playerBAnswer: null,
          roundStartedAt: playingDue ? sync.roundStartedAt : null,
          timeRemaining: 25,
          lastRoundPointsA: 0,
          lastRoundPointsB: 0,
        });
        playRef.current("reveal");

        if (playingDue) {
          onEnterPlayingRef.current();
        } else {
          flipTimerRef.current = window.setTimeout(
            () => enterPlaying(sync.questionIndex, sync.roundStartedAt),
            Math.max(0, sync.roundStartedAt - now)
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
          enterPlaying(sync.questionIndex, sync.roundStartedAt);
        } else if (flipTimerRef.current === null) {
          flipTimerRef.current = window.setTimeout(
            () => enterPlaying(sync.questionIndex, sync.roundStartedAt),
            Math.max(0, sync.roundStartedAt - now)
          );
        }
      }
      // Already playing: never touch state (answers may be in flight).
    },
    [clearFlipTimer, enterPlaying, refreshPlaylist]
  );

  /**
   * Host: publish a round. Applies locally first (the host never waits on the
   * network), then writes to the DB with retries.
   */
  const leaderStartRound = useCallback(
    async (questionIndex: number, appendQuestionId?: string) => {
      if (!isLeaderRef.current) {
        return;
      }

      const sync: MatchSyncState = {
        questionIndex,
        phase: "round",
        roundStartedAt: Date.now() + TOPIC_REVEAL_MS,
      };

      applySync(sync);

      for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt += 1) {
        const result = await updateMatchSyncState(
          sessionIdRef.current,
          sync,
          appendQuestionId
        );
        if (result.success) {
          return;
        }
        console.error(
          `[match-sync] round write failed (attempt ${attempt}): ${result.error}`
        );
      }
    },
    [applySync]
  );

  const leaderFinishMatch = useCallback(async () => {
    if (!isLeaderRef.current) {
      return;
    }

    clearFlipTimer();
    const sync: MatchSyncState = {
      questionIndex: useGameStore.getState().currentQuestionIndex,
      phase: "match_finished",
      roundStartedAt: Date.now(),
    };

    for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt += 1) {
      const result = await updateMatchSyncState(sessionIdRef.current, sync);
      if (result.success) {
        return;
      }
      console.error(
        `[match-sync] finish write failed (attempt ${attempt}): ${result.error}`
      );
    }
  }, [clearFlipTimer]);

  /** Host: start round 0 once the opponent has joined the session row. */
  const ensureMatchStarted = useCallback(async () => {
    if (!isLeaderRef.current || matchStartedRef.current || startingRef.current) {
      return;
    }

    startingRef.current = true;
    try {
      const result = await getMatchSyncState(sessionIdRef.current);
      if (!result.success) {
        return;
      }

      if (result.sync) {
        // Already started (e.g. host refreshed) — the poll loop resumes it.
        matchStartedRef.current = true;
        return;
      }

      if (!result.hasOpponent || result.status !== "active") {
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

  // Both players poll the database — single source of truth.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let loggedFailure = false;

    const tick = async () => {
      try {
        const result = await getMatchSyncState(sessionIdRef.current);
        if (cancelled) {
          return;
        }
        if (!result.success) {
          if (!loggedFailure) {
            loggedFailure = true;
            console.error(`[match-sync] poll failed: ${result.error}`);
          }
          return;
        }
        loggedFailure = false;
        if (result.sync) {
          applySync(result.sync);
        }
      } catch {
        // Transient network error — next poll retries.
      }
    };

    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      clearFlipTimer();
    };
  }, [applySync, clearFlipTimer, enabled, sessionId]);

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
