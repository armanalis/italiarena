"use client";

import { useCallback, useEffect, useRef } from "react";
import { updateMatchSyncState } from "@/app/dashboard/match/sync-actions";
import { getMatchSession } from "@/app/dashboard/matchmaking/actions";
import {
  playlistIdsSignature,
  type MatchSyncState,
} from "@/lib/match-sync";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useGameStore } from "@/store/useGameStore";
import type { QuestionActive } from "@/types/database.types";

const TOPIC_REVEAL_MS = 750;
const POLL_MS = 300;

type UseServerMatchSyncOptions = {
  sessionId: string;
  isLeader: boolean;
  serverPlaylist: QuestionActive[];
  enabled: boolean;
  onEnterPlaying: () => void;
};

export function useServerMatchSync({
  sessionId,
  isLeader,
  serverPlaylist,
  enabled,
  onEnterPlaying,
}: UseServerMatchSyncOptions) {
  const { play } = useGameAudio();
  const onEnterPlayingRef = useRef(onEnterPlaying);
  onEnterPlayingRef.current = onEnterPlaying;

  const lastAppliedAtRef = useRef(0);
  const leaderTimerRef = useRef<number | null>(null);
  const matchStartedRef = useRef(false);
  const drivingRef = useRef(false);

  const getPlaylistSig = useCallback(() => {
    const playlist = useGameStore.getState().playlist;
    return playlistIdsSignature(playlist);
  }, []);

  const clearLeaderTimer = useCallback(() => {
    if (leaderTimerRef.current !== null) {
      window.clearTimeout(leaderTimerRef.current);
      leaderTimerRef.current = null;
    }
  }, []);

  const writeSync = useCallback(
    async (state: Omit<MatchSyncState, "playlistSig" | "updatedAt">) => {
      if (!isLeader) {
        return;
      }

      await updateMatchSyncState(sessionId, {
        ...state,
        playlistSig: getPlaylistSig(),
      });
    },
    [getPlaylistSig, isLeader, sessionId]
  );

  const applyServerState = useCallback(
    (sync: MatchSyncState) => {
      const updatedAt = sync.updatedAt ?? 0;
      if (updatedAt > 0 && updatedAt <= lastAppliedAtRef.current) {
        return;
      }

      if (updatedAt > 0) {
        lastAppliedAtRef.current = updatedAt;
      }

      const live = useGameStore.getState();

      if (sync.phase === "match_finished") {
        useGameStore.setState({ roundPhase: "match_finished" });
        return;
      }

      if (sync.phase === "topic_reveal") {
        const sameReveal =
          live.roundPhase === "topic_reveal" &&
          live.currentQuestionIndex === sync.questionIndex;

        if (sameReveal) {
          return;
        }

        useGameStore.setState({
          currentQuestionIndex: sync.questionIndex,
          roundPhase: "topic_reveal",
          playerAAnswer: null,
          playerBAnswer: null,
          roundStartedAt: null,
          timeRemaining: 25,
          lastRoundPointsA: 0,
          lastRoundPointsB: 0,
        });
        play("reveal");
        return;
      }

      if (sync.phase === "playing" && sync.roundStartedAt) {
        const sameRound =
          live.roundPhase === "playing" &&
          live.currentQuestionIndex === sync.questionIndex &&
          live.roundStartedAt === sync.roundStartedAt;

        if (sameRound) {
          return;
        }

        useGameStore.setState({
          currentQuestionIndex: sync.questionIndex,
          roundPhase: "playing",
          roundStartedAt: sync.roundStartedAt,
          timeRemaining: 25,
          playerAAnswer: null,
          playerBAnswer: null,
          lastRoundPointsA: 0,
          lastRoundPointsB: 0,
        });
        onEnterPlayingRef.current();
        return;
      }

      if (sync.phase === "round_result") {
        if (live.roundPhase === "round_result") {
          return;
        }
        // Scores / resolveRound are handled locally when answers arrive.
        useGameStore.setState({ roundPhase: "round_result" });
      }
    },
    [play]
  );

  const pollServer = useCallback(async () => {
    const result = await getMatchSession(sessionId);
    if (!result.success) {
      return null;
    }

    if (result.data.playlist.length > 0) {
      const serverSig = playlistIdsSignature(result.data.playlist);
      const localSig = playlistIdsSignature(useGameStore.getState().playlist);
      if (serverSig !== localSig || useGameStore.getState().playlist.length === 0) {
        useGameStore.setState({ playlist: result.data.playlist });
      }
    }

    if (result.data.matchSync) {
      applyServerState(result.data.matchSync);
    }

    return result.data;
  }, [applyServerState, sessionId]);

  const startLeaderMatch = useCallback(async () => {
    if (!isLeader || matchStartedRef.current || drivingRef.current) {
      return;
    }

    drivingRef.current = true;

    const data = await pollServer();
    if (!data?.opponent || data.matchSync) {
      drivingRef.current = false;
      if (data?.matchSync) {
        matchStartedRef.current = true;
      }
      return;
    }

    matchStartedRef.current = true;
    await writeSync({
      questionIndex: 0,
      phase: "topic_reveal",
      roundStartedAt: null,
    });

    clearLeaderTimer();
    leaderTimerRef.current = window.setTimeout(() => {
      void writeSync({
        questionIndex: 0,
        phase: "playing",
        roundStartedAt: Date.now(),
      });
      drivingRef.current = false;
    }, TOPIC_REVEAL_MS);
  }, [clearLeaderTimer, isLeader, pollServer, writeSync]);

  const leaderShowTopic = useCallback(
    async (questionIndex: number) => {
      if (!isLeader) {
        return;
      }

      clearLeaderTimer();
      drivingRef.current = true;

      await writeSync({
        questionIndex,
        phase: "topic_reveal",
        roundStartedAt: null,
      });

      leaderTimerRef.current = window.setTimeout(() => {
        void writeSync({
          questionIndex,
          phase: "playing",
          roundStartedAt: Date.now(),
        }).then(() => {
          drivingRef.current = false;
        });
      }, TOPIC_REVEAL_MS);
    },
    [clearLeaderTimer, isLeader, writeSync]
  );

  const leaderShowRoundResult = useCallback(
    async (questionIndex: number) => {
      if (!isLeader) {
        return;
      }

      await writeSync({
        questionIndex,
        phase: "round_result",
        roundStartedAt: null,
      });
    },
    [isLeader, writeSync]
  );

  const leaderFinishMatch = useCallback(
    async (questionIndex: number) => {
      if (!isLeader) {
        return;
      }

      clearLeaderTimer();
      await writeSync({
        questionIndex,
        phase: "match_finished",
        roundStartedAt: null,
      });
    },
    [clearLeaderTimer, isLeader, writeSync]
  );

  // Authoritative playlist from the server-rendered match page.
  useEffect(() => {
    if (!enabled || serverPlaylist.length === 0) {
      return;
    }

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
    });
  }, [enabled, serverPlaylist, sessionId]);

  // Both players poll the database — single source of truth.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void pollServer();
    const interval = window.setInterval(() => {
      void pollServer();
    }, POLL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, pollServer]);

  // Host starts the match once an opponent exists in the session row.
  useEffect(() => {
    if (!enabled || !isLeader) {
      return;
    }

    void startLeaderMatch();
    const interval = window.setInterval(() => {
      void startLeaderMatch();
    }, 500);

    return () => {
      window.clearInterval(interval);
      clearLeaderTimer();
    };
  }, [clearLeaderTimer, enabled, isLeader, startLeaderMatch]);

  return {
    leaderShowTopic,
    leaderShowRoundResult,
    leaderFinishMatch,
  };
}
