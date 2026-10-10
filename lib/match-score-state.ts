/**
 * Server-authoritative cumulative match scores.
 *
 * Live points used to live only in the Zustand store, so a page refresh
 * zeroed the entire point process even though the round cursor survived in
 * `game_sessions.question_playlist`. This document is written to
 * `game_sessions.score_state` after every resolved round and rehydrated on
 * mount so scores, response times, and round reviews survive reloads.
 */

import {
  emptyCategoryProgress,
  normalizeCategoryProgress,
} from "@/lib/category-progress";
import { determineWinner, type MatchWinner } from "@/lib/scoring";
import type { CategoryProgress } from "@/lib/types";
import type { CorrectAnswer, QuestionCategory } from "@/types/database.types";

/** One player's side of a resolved PvP round. */
export type RoundPlayerResult = {
  selectedAnswer: CorrectAnswer | null;
  selectedOptionText: string | null;
  wasCorrect: boolean;
  pointsEarned: number;
};

/** One completed round, stored for end-of-match review and server rehydration. */
export type MatchRoundReview = {
  questionIndex: number;
  isTiebreaker: boolean;
  questionId: string;
  category: QuestionCategory;
  questionText: string;
  correctAnswer: CorrectAnswer;
  correctOptionText: string;
  selectedAnswer: CorrectAnswer | null;
  selectedOptionText: string | null;
  wasCorrect: boolean;
  pointsEarned: number;
  /**
   * PvP rounds scored by resolve_match_round carry both players' results; the
   * top-level answer fields are player A's. Read through scoreStateForRole.
   */
  byRole?: { a: RoundPlayerResult; b: RoundPlayerResult };
};

/** Clock of the question in play when the doc was written (bot matches only). */
export type ActiveRoundClock = {
  questionIndex: number;
  startedAt: number;
  pauseOffsetMs: number;
  pauseStartedAt: number | null;
};

export type MatchScoreState = {
  /** Highest question index that has already been scored (−1 = none yet). */
  resolvedThroughIndex: number;
  playerAScore: number;
  playerBScore: number;
  playerAResponseTimes: number[];
  playerBResponseTimes: number[];
  lastRoundPointsA: number;
  lastRoundPointsB: number;
  categoryProgress: CategoryProgress;
  roundReviews: MatchRoundReview[];
  tiebreakerUsed: boolean;
  matchFinished: boolean;
  matchWinner: MatchWinner | null;
  /** Lets a refresh resume the question clock instead of restarting it. */
  activeRound?: ActiveRoundClock | null;
  /** PvP: category stats per player (`categoryProgress` is player A's). */
  categoryProgressByRole?: { a: CategoryProgress; b: CategoryProgress };
};

function isRoundPlayerResult(value: unknown): value is RoundPlayerResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as RoundPlayerResult;
  return (
    (result.selectedAnswer === null || isCorrectAnswer(result.selectedAnswer)) &&
    (result.selectedOptionText === null ||
      typeof result.selectedOptionText === "string") &&
    typeof result.wasCorrect === "boolean" &&
    typeof result.pointsEarned === "number"
  );
}

/**
 * A PvP score document holds both players' results. Keep only this player's
 * answers, right/wrong, points and category stats, so nobody sees (or saves
 * as their mistakes) the opponent's picks. Bot documents pass through as is.
 */
export function scoreStateForRole(
  score: MatchScoreState,
  role: "a" | "b"
): MatchScoreState {
  const byRoleProgress = score.categoryProgressByRole?.[role];

  return {
    ...score,
    roundReviews: score.roundReviews.map((round) => {
      const mine = round.byRole?.[role];
      if (!isRoundPlayerResult(mine)) {
        return round;
      }
      const { byRole: _byRole, ...shared } = round;
      return { ...shared, ...mine };
    }),
    categoryProgress:
      byRoleProgress && typeof byRoleProgress === "object"
        ? byRoleProgress
        : score.categoryProgress,
  };
}

const QUESTION_CATEGORIES: QuestionCategory[] = [
  "grammar",
  "vocabulary",
  "fill-in-the-blank",
  "idioms",
];

function isCorrectAnswer(value: unknown): value is CorrectAnswer {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function isQuestionCategory(value: unknown): value is QuestionCategory {
  return (
    typeof value === "string" &&
    QUESTION_CATEGORIES.includes(value as QuestionCategory)
  );
}

function isMatchRoundReview(value: unknown): value is MatchRoundReview {
  if (!value || typeof value !== "object") {
    return false;
  }

  const round = value as MatchRoundReview;
  return (
    typeof round.questionIndex === "number" &&
    typeof round.isTiebreaker === "boolean" &&
    typeof round.questionId === "string" &&
    isQuestionCategory(round.category) &&
    typeof round.questionText === "string" &&
    isCorrectAnswer(round.correctAnswer) &&
    typeof round.correctOptionText === "string" &&
    (round.selectedAnswer === null || isCorrectAnswer(round.selectedAnswer)) &&
    (round.selectedOptionText === null ||
      typeof round.selectedOptionText === "string") &&
    typeof round.wasCorrect === "boolean" &&
    typeof round.pointsEarned === "number"
  );
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

export function isMatchScoreState(value: unknown): value is MatchScoreState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as MatchScoreState;
  return (
    typeof state.resolvedThroughIndex === "number" &&
    typeof state.playerAScore === "number" &&
    typeof state.playerBScore === "number" &&
    isNumberArray(state.playerAResponseTimes) &&
    isNumberArray(state.playerBResponseTimes) &&
    typeof state.lastRoundPointsA === "number" &&
    typeof state.lastRoundPointsB === "number" &&
    typeof state.tiebreakerUsed === "boolean" &&
    typeof state.matchFinished === "boolean" &&
    (state.matchWinner === null ||
      state.matchWinner === "a" ||
      state.matchWinner === "b" ||
      state.matchWinner === "tie") &&
    Array.isArray(state.roundReviews) &&
    state.roundReviews.every(isMatchRoundReview)
  );
}

export type ScoreSnapshotInput = {
  currentQuestionIndex: number;
  playerAScore: number;
  playerBScore: number;
  playerAResponseTimes: number[];
  playerBResponseTimes: number[];
  lastRoundPointsA: number;
  lastRoundPointsB: number;
  categoryProgress: CategoryProgress;
  roundReviews: MatchRoundReview[];
  tiebreakerUsed: boolean;
  roundPhase: string;
  matchWinner: MatchWinner | null;
  roundStartedAt: number | null;
  timerPauseOffsetMs: number;
  timerPauseStartedAt: number | null;
};

export function buildMatchScoreState(input: ScoreSnapshotInput): MatchScoreState {
  const matchFinished =
    input.roundPhase === "match_finished" || input.matchWinner !== null;

  return {
    resolvedThroughIndex:
      input.roundReviews.length > 0
        ? Math.max(...input.roundReviews.map((round) => round.questionIndex))
        : -1,
    playerAScore: input.playerAScore,
    playerBScore: input.playerBScore,
    playerAResponseTimes: input.playerAResponseTimes,
    playerBResponseTimes: input.playerBResponseTimes,
    lastRoundPointsA: input.lastRoundPointsA,
    lastRoundPointsB: input.lastRoundPointsB,
    categoryProgress: normalizeCategoryProgress(input.categoryProgress),
    roundReviews: input.roundReviews,
    tiebreakerUsed: input.tiebreakerUsed,
    matchFinished,
    matchWinner:
      input.matchWinner ??
      (matchFinished
        ? determineWinner(
            input.playerAScore,
            input.playerBScore
          )
        : null),
    activeRound:
      input.roundPhase === "playing" && input.roundStartedAt !== null
        ? {
            questionIndex: input.currentQuestionIndex,
            startedAt: input.roundStartedAt,
            pauseOffsetMs: input.timerPauseOffsetMs,
            pauseStartedAt: input.timerPauseStartedAt,
          }
        : null,
  };
}

/** The saved question clock, only if it belongs to `questionIndex`. */
export function readActiveRoundClock(
  score: MatchScoreState,
  questionIndex: number
): ActiveRoundClock | null {
  const clock = score.activeRound;
  if (
    !clock ||
    typeof clock !== "object" ||
    clock.questionIndex !== questionIndex ||
    typeof clock.startedAt !== "number" ||
    typeof clock.pauseOffsetMs !== "number" ||
    (clock.pauseStartedAt !== null && typeof clock.pauseStartedAt !== "number")
  ) {
    return null;
  }

  return clock;
}

export type BotResumePlan =
  | { kind: "fresh" }
  | { kind: "finished" }
  | { kind: "resume"; questionIndex: number; clock: ActiveRoundClock | null };

/**
 * What a reloaded bot match should do. A saved question clock counts even
 * before any round is scored — a refresh on question 1 must keep its clock,
 * not restart the match.
 */
export function planBotMatchResume(
  score: MatchScoreState | null,
  playlistLength: number
): BotResumePlan {
  if (!score) {
    return { kind: "fresh" };
  }

  const nextIndex = score.resolvedThroughIndex + 1;
  const clock = readActiveRoundClock(score, nextIndex);

  if (score.resolvedThroughIndex < 0 && !clock) {
    return { kind: "fresh" };
  }

  if (score.matchFinished || nextIndex >= playlistLength) {
    return { kind: "finished" };
  }

  return { kind: "resume", questionIndex: nextIndex, clock };
}

/** Patch applied to the Zustand store when rehydrating from the server. */
export function scoreStateToStorePatch(score: MatchScoreState) {
  const categoryProgress = normalizeCategoryProgress(
    score.categoryProgress ?? emptyCategoryProgress()
  );

  if (score.matchFinished) {
    return {
      playerAScore: score.playerAScore,
      playerBScore: score.playerBScore,
      playerAResponseTimes: score.playerAResponseTimes,
      playerBResponseTimes: score.playerBResponseTimes,
      lastRoundPointsA: score.lastRoundPointsA,
      lastRoundPointsB: score.lastRoundPointsB,
      categoryProgress,
      roundReviews: score.roundReviews,
      tiebreakerUsed: score.tiebreakerUsed,
      roundPhase: "match_finished" as const,
      status: "finished" as const,
      matchWinner:
        score.matchWinner ??
        determineWinner(
          score.playerAScore,
          score.playerBScore
        ),
    };
  }

  return {
    playerAScore: score.playerAScore,
    playerBScore: score.playerBScore,
    playerAResponseTimes: score.playerAResponseTimes,
    playerBResponseTimes: score.playerBResponseTimes,
    lastRoundPointsA: score.lastRoundPointsA,
    lastRoundPointsB: score.lastRoundPointsB,
    categoryProgress,
    roundReviews: score.roundReviews,
    tiebreakerUsed: score.tiebreakerUsed,
  };
}

export function localResolvedThroughIndex(
  roundReviews: MatchRoundReview[]
): number {
  if (roundReviews.length === 0) {
    return -1;
  }

  return Math.max(...roundReviews.map((round) => round.questionIndex));
}

/**
 * True when `incoming` should replace the locally known score document
 * (strictly more rounds resolved, or same rounds but newly finished).
 */
export function shouldApplyScoreState(
  incoming: MatchScoreState,
  localResolvedThrough: number,
  localMatchFinished: boolean
): boolean {
  if (incoming.resolvedThroughIndex > localResolvedThrough) {
    return true;
  }

  if (
    incoming.resolvedThroughIndex === localResolvedThrough &&
    incoming.matchFinished &&
    !localMatchFinished
  ) {
    return true;
  }

  return false;
}

/**
 * After a refresh, the sync cursor may still point at a round that
 * `score_state` already scored (result screen / between-round pause).
 * Replaying that round as "playing" desyncs the refresher from the opponent.
 */
export function shouldResumeRoundResult(
  syncQuestionIndex: number,
  resolvedThroughIndex: number
): boolean {
  return (
    Number.isFinite(syncQuestionIndex) &&
    Number.isFinite(resolvedThroughIndex) &&
    resolvedThroughIndex >= syncQuestionIndex
  );
}

/** The opponent has not locked this round at all, not even "timed out". */
export function isOpponentMissing(state: {
  localPlayerRole: "a" | "b" | null;
  playerAAnswer: unknown;
  playerBAnswer: unknown;
}): boolean {
  return !(state.localPlayerRole === "a" ? state.playerBAnswer : state.playerAAnswer);
}

/** Longer than the 5 s result screen, so a healthy match never asks. */
export const SILENT_CHECK_AFTER_MS = 7_000;
export const SILENT_CHECK_EVERY_MS = 3_000;

/**
 * Whether to ask the server if the opponent went silent: only on a waiting
 * screen (during a question the local clock moves the round on by itself)
 * that has not changed for a while.
 */
export function shouldCheckSilentOpponent(input: {
  roundPhase: string;
  finished: boolean;
  stalledMs: number;
  sinceLastCheckMs: number;
}): boolean {
  const waiting =
    input.roundPhase === "waiting" ||
    input.roundPhase === "round_result" ||
    input.roundPhase === "tiebreaker_loading";

  return (
    waiting &&
    !input.finished &&
    input.stalledMs >= SILENT_CHECK_AFTER_MS &&
    input.sinceLastCheckMs >= SILENT_CHECK_EVERY_MS
  );
}
