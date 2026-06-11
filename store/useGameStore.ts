"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { REGULAR_MATCH_QUESTIONS } from "@/lib/match";
import {
  emptyCategoryProgress,
  normalizeCategoryProgress,
} from "@/lib/category-progress";
import { safeLocalStorage } from "@/lib/safe-storage";
import {
  computePoints,
  determineWinner,
  getOptionText,
  isAnswerCorrect,
  type MatchWinner,
} from "@/lib/scoring";
import type { BotDifficulty } from "@/lib/bot";
import type { ProficiencyLevel } from "@/lib/constants";
import type { CategoryProgress } from "@/lib/types";
import type { CorrectAnswer, QuestionActive, QuestionCategory } from "@/types/database.types";

export type GameStoreStatus = "idle" | "searching" | "playing" | "finished";

export type RoundPhase =
  | "topic_reveal"
  | "playing"
  | "waiting"
  | "round_result"
  | "tiebreaker_loading"
  | "match_finished";

export type GameOpponent = {
  id: string;
  isGhost: boolean;
  displayName: string;
};

export type LockedAnswer = {
  answer: CorrectAnswer | null;
  responseTimeMs: number | null;
};

/** One completed round, stored for end-of-match review. */
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

type GameStoreState = {
  gameSessionId: string | null;
  status: GameStoreStatus;
  opponent: GameOpponent | null;
  playlist: QuestionActive[];
  hasHydrated: boolean;
  currentQuestionIndex: number;
  playerAScore: number;
  playerBScore: number;
  isBotMatch: boolean;
  botDifficulty: BotDifficulty | null;
  roundPhase: RoundPhase;
  localPlayerRole: "a" | "b" | null;
  localUserId: string | null;
  proficiencyLevel: ProficiencyLevel | null;
  playerAAnswer: LockedAnswer | null;
  playerBAnswer: LockedAnswer | null;
  playerAResponseTimes: number[];
  playerBResponseTimes: number[];
  roundStartedAt: number | null;
  timeRemaining: number;
  lastRoundPointsA: number;
  lastRoundPointsB: number;
  matchWinner: MatchWinner | null;
  categoryProgress: CategoryProgress;
  matchSaved: boolean;
  tiebreakerQuestion: QuestionActive | null;
  tiebreakerUsed: boolean;
  roundReviews: MatchRoundReview[];
  isReportDialogOpen: boolean;
};

type GameStoreActions = {
  setHasHydrated: (value: boolean) => void;
  setSearching: () => void;
  setSessionId: (sessionId: string) => void;
  startMatch: (payload: {
    gameSessionId: string;
    opponent: GameOpponent;
    playlist: QuestionActive[];
    botDifficulty?: BotDifficulty | null;
  }) => void;
  startTiebreakerRound: (question: QuestionActive) => void;
  initGameplay: (payload: {
    localUserId: string;
    localPlayerRole: "a" | "b";
    isBotMatch: boolean;
    proficiencyLevel: ProficiencyLevel;
  }) => void;
  setRoundPhase: (phase: RoundPhase) => void;
  beginRound: (startedAt?: number) => void;
  setTimeRemaining: (seconds: number) => void;
  lockLocalAnswer: (answer: CorrectAnswer | null, responseTimeMs: number | null) => void;
  lockOpponentAnswer: (answer: CorrectAnswer | null, responseTimeMs: number | null) => void;
  resolveRound: () => void;
  advanceToNextRound: () => void;
  setPlaying: () => void;
  finishMatch: () => void;
  markMatchSaved: () => void;
  setReportDialogOpen: (open: boolean) => void;
  reset: () => void;
};

const QUESTION_CATEGORIES: QuestionCategory[] = [
  "grammar",
  "vocabulary",
  "fill-in-the-blank",
  "idioms",
];

function normalizeQuestionCategory(value: string): QuestionCategory {
  const trimmed = value.trim();
  if (QUESTION_CATEGORIES.includes(trimmed as QuestionCategory)) {
    return trimmed as QuestionCategory;
  }

  const lower = trimmed.toLowerCase();
  if (lower === "fill in the blank" || lower === "fill_in_the_blank") {
    return "fill-in-the-blank";
  }

  if (QUESTION_CATEGORIES.includes(lower as QuestionCategory)) {
    return lower as QuestionCategory;
  }

  return "grammar";
}

function normalizeRoundReviews(
  reviews: MatchRoundReview[] | undefined | null
): MatchRoundReview[] {
  if (!Array.isArray(reviews)) {
    return [];
  }

  return reviews.filter(
    (round): round is MatchRoundReview =>
      Boolean(round) &&
      typeof round.questionText === "string" &&
      typeof round.questionId === "string"
  );
}

/** Gameplay reset without wiping player identity (set by initGameplay on the match page). */
function getGameplayReset() {
  const {
    localPlayerRole: _role,
    localUserId: _userId,
    proficiencyLevel: _level,
    ...reset
  } = gameplayDefaults;
  return reset;
}

const gameplayDefaults: Pick<
  GameStoreState,
  | "currentQuestionIndex"
  | "playerAScore"
  | "playerBScore"
  | "isBotMatch"
  | "roundPhase"
  | "localPlayerRole"
  | "localUserId"
  | "proficiencyLevel"
  | "playerAAnswer"
  | "playerBAnswer"
  | "playerAResponseTimes"
  | "playerBResponseTimes"
  | "roundStartedAt"
  | "timeRemaining"
  | "lastRoundPointsA"
  | "lastRoundPointsB"
  | "matchWinner"
  | "categoryProgress"
  | "matchSaved"
  | "tiebreakerQuestion"
  | "tiebreakerUsed"
  | "roundReviews"
> = {
  currentQuestionIndex: 0,
  playerAScore: 0,
  playerBScore: 0,
  isBotMatch: false,
  roundPhase: "topic_reveal",
  localPlayerRole: null,
  localUserId: null,
  proficiencyLevel: null,
  playerAAnswer: null,
  playerBAnswer: null,
  playerAResponseTimes: [],
  playerBResponseTimes: [],
  roundStartedAt: null,
  timeRemaining: 25,
  lastRoundPointsA: 0,
  lastRoundPointsB: 0,
  matchWinner: null,
  categoryProgress: emptyCategoryProgress(),
  matchSaved: false,
  tiebreakerQuestion: null,
  tiebreakerUsed: false,
  roundReviews: [],
};

const initialState: GameStoreState = {
  gameSessionId: null,
  status: "idle",
  opponent: null,
  playlist: [],
  hasHydrated: false,
  isReportDialogOpen: false,
  botDifficulty: null,
  ...gameplayDefaults,
};

export const useGameStore = create<GameStoreState & GameStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setSearching: () =>
        set({
          gameSessionId: null,
          status: "searching",
          opponent: null,
          playlist: [],
          botDifficulty: null,
          ...gameplayDefaults,
        }),
      setSessionId: (sessionId) => set({ gameSessionId: sessionId }),
      startMatch: ({ gameSessionId, opponent, playlist, botDifficulty = null }) =>
        set({
          gameSessionId,
          status: "playing",
          opponent,
          playlist,
          ...getGameplayReset(),
          categoryProgress: emptyCategoryProgress(),
          roundPhase: "topic_reveal",
          botDifficulty: opponent.isGhost ? botDifficulty ?? "medium" : null,
        }),
      startTiebreakerRound: (question) =>
        set((state) => ({
          playlist: [...state.playlist, question],
          tiebreakerQuestion: question,
          tiebreakerUsed: true,
          currentQuestionIndex: state.playlist.length,
          roundPhase: "topic_reveal",
          playerAAnswer: null,
          playerBAnswer: null,
          roundStartedAt: null,
          timeRemaining: 25,
          lastRoundPointsA: 0,
          lastRoundPointsB: 0,
        })),
      initGameplay: ({ localUserId, localPlayerRole, isBotMatch, proficiencyLevel }) =>
        set((state) => ({
          localUserId,
          localPlayerRole,
          isBotMatch,
          proficiencyLevel,
          categoryProgress: normalizeCategoryProgress(state.categoryProgress),
        })),
      setRoundPhase: (phase) => set({ roundPhase: phase }),
      beginRound: (startedAt) =>
        set({
          roundPhase: "playing",
          roundStartedAt: startedAt ?? Date.now(),
          timeRemaining: 25,
          playerAAnswer: null,
          playerBAnswer: null,
          lastRoundPointsA: 0,
          lastRoundPointsB: 0,
        }),
      setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),
      lockLocalAnswer: (answer, responseTimeMs) => {
        const { localPlayerRole } = get();
        if (!localPlayerRole) {
          return;
        }

        const locked: LockedAnswer = { answer, responseTimeMs };

        if (localPlayerRole === "a") {
          set({ playerAAnswer: locked, roundPhase: "waiting" });
        } else {
          set({ playerBAnswer: locked, roundPhase: "waiting" });
        }
      },
      lockOpponentAnswer: (answer, responseTimeMs) => {
        const { localPlayerRole } = get();
        if (!localPlayerRole) {
          return;
        }

        const locked: LockedAnswer = { answer, responseTimeMs };

        if (localPlayerRole === "a") {
          set({ playerBAnswer: locked });
        } else {
          set({ playerAAnswer: locked });
        }
      },
      resolveRound: () => {
        const state = get();
        const question = state.playlist[state.currentQuestionIndex];
        if (!question) {
          return;
        }

        const answerA = state.playerAAnswer;
        const answerB = state.playerBAnswer;

        const correctA = isAnswerCorrect(
          answerA?.answer ?? null,
          question.correct_answer
        );
        const correctB = isAnswerCorrect(
          answerB?.answer ?? null,
          question.correct_answer
        );

        const pointsA = computePoints(correctA, answerA?.responseTimeMs ?? null);
        const pointsB = computePoints(correctB, answerB?.responseTimeMs ?? null);

        const nextAResponseTimes = [...state.playerAResponseTimes];
        const nextBResponseTimes = [...state.playerBResponseTimes];

        if (answerA?.responseTimeMs != null) {
          nextAResponseTimes.push(answerA.responseTimeMs);
        }
        if (answerB?.responseTimeMs != null) {
          nextBResponseTimes.push(answerB.responseTimeMs);
        }

        const localRole = state.localPlayerRole;
        const localAnswer =
          localRole === "a" ? answerA?.answer ?? null : answerB?.answer ?? null;
        const localPoints = localRole === "a" ? pointsA : pointsB;
        const wasCorrect = isAnswerCorrect(localAnswer, question.correct_answer);
        const nextCategoryProgress = normalizeCategoryProgress(
          state.categoryProgress
        );
        const category = normalizeQuestionCategory(question.category);
        const categoryStats = nextCategoryProgress[category];
        nextCategoryProgress[category] = {
          correct: categoryStats.correct + (wasCorrect ? 1 : 0),
          total: categoryStats.total + 1,
        };

        const roundReview: MatchRoundReview = {
          questionIndex: state.currentQuestionIndex,
          isTiebreaker: state.currentQuestionIndex >= REGULAR_MATCH_QUESTIONS,
          questionId: question.id,
          category,
          questionText: question.question_text,
          correctAnswer: question.correct_answer,
          correctOptionText: getOptionText(question, question.correct_answer),
          selectedAnswer: localAnswer,
          selectedOptionText: localAnswer
            ? getOptionText(question, localAnswer)
            : null,
          wasCorrect,
          pointsEarned: localPoints,
        };

        set({
          roundPhase: "round_result",
          playerAScore: state.playerAScore + pointsA,
          playerBScore: state.playerBScore + pointsB,
          playerAResponseTimes: nextAResponseTimes,
          playerBResponseTimes: nextBResponseTimes,
          lastRoundPointsA: pointsA,
          lastRoundPointsB: pointsB,
          categoryProgress: nextCategoryProgress,
          roundReviews: [...state.roundReviews, roundReview],
        });
      },
      advanceToNextRound: () => {
        const state = get();
        const nextIndex = state.currentQuestionIndex + 1;

        if (nextIndex >= state.playlist.length) {
          set({
            roundPhase: "match_finished",
            status: "finished",
            matchWinner: determineWinner(
              state.playerAScore,
              state.playerBScore,
              state.playerAResponseTimes,
              state.playerBResponseTimes
            ),
          });
          return;
        }

        set({
          currentQuestionIndex: nextIndex,
          roundPhase: "topic_reveal",
          playerAAnswer: null,
          playerBAnswer: null,
          roundStartedAt: null,
          timeRemaining: 25,
          lastRoundPointsA: 0,
          lastRoundPointsB: 0,
        });
      },
      setPlaying: () => set({ status: "playing" }),
      finishMatch: () => set({ status: "finished", roundPhase: "match_finished" }),
      markMatchSaved: () => set({ matchSaved: true }),
      setReportDialogOpen: (open) => set({ isReportDialogOpen: open }),
      reset: () => set({ ...initialState, hasHydrated: true }),
    }),
    {
      name: "language-quiz-game",
      storage: createJSONStorage(() => safeLocalStorage),
      // Keep persistence small — full playlists + review text can exceed localStorage
      // quota and crash the app when the match ends.
      partialize: (state): Partial<GameStoreState> => ({
        gameSessionId: state.gameSessionId,
        status: state.status,
        opponent: state.opponent,
        currentQuestionIndex: state.currentQuestionIndex,
        playerAScore: state.playerAScore,
        playerBScore: state.playerBScore,
        isBotMatch: state.isBotMatch,
        botDifficulty: state.botDifficulty,
        roundPhase: state.roundPhase,
        localPlayerRole: state.localPlayerRole,
        localUserId: state.localUserId,
        proficiencyLevel: state.proficiencyLevel,
        matchWinner: state.matchWinner,
        matchSaved: state.matchSaved,
        tiebreakerUsed: state.tiebreakerUsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.categoryProgress = normalizeCategoryProgress(
            state.categoryProgress
          );
          state.roundReviews = normalizeRoundReviews(state.roundReviews);
          state.setHasHydrated(true);
        }
      },
    }
  )
);

export function useGameStoreHydrated() {
  return useGameStore((state) => state.hasHydrated);
}

export function useLocalScore() {
  return useGameStore((state) => {
    if (state.localPlayerRole === "a") {
      return state.playerAScore;
    }
    if (state.localPlayerRole === "b") {
      return state.playerBScore;
    }
    return 0;
  });
}

export function useOpponentScore() {
  return useGameStore((state) => {
    if (state.localPlayerRole === "a") {
      return state.playerBScore;
    }
    if (state.localPlayerRole === "b") {
      return state.playerAScore;
    }
    return 0;
  });
}

export function usePlayerAScore() {
  return useGameStore((state) => state.playerAScore);
}

export function usePlayerBScore() {
  return useGameStore((state) => state.playerBScore);
}

export function useMatchRoundReviews() {
  return useGameStore((state) => state.roundReviews);
}

export function useMatchMistakes() {
  const roundReviews = useMatchRoundReviews();
  return roundReviews.filter((round) => !round.wasCorrect);
}
