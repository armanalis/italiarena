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
};

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
            input.playerBScore,
            input.playerAResponseTimes,
            input.playerBResponseTimes
          )
        : null),
  };
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
          score.playerBScore,
          score.playerAResponseTimes,
          score.playerBResponseTimes
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
