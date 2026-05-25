import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  computePoints,
  determineWinner,
  isAnswerCorrect,
  type MatchWinner,
} from "@/lib/scoring";
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
};

type GameStoreActions = {
  setHasHydrated: (value: boolean) => void;
  setSearching: () => void;
  setSessionId: (sessionId: string) => void;
  startMatch: (payload: {
    gameSessionId: string;
    opponent: GameOpponent;
    playlist: QuestionActive[];
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
  reset: () => void;
};

const emptyCategoryProgress = (): CategoryProgress => ({
  grammar: { correct: 0, total: 0 },
  vocabulary: { correct: 0, total: 0 },
  "fill-in-the-blank": { correct: 0, total: 0 },
  idioms: { correct: 0, total: 0 },
});

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
};

const initialState: GameStoreState = {
  gameSessionId: null,
  status: "idle",
  opponent: null,
  playlist: [],
  hasHydrated: false,
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
          ...gameplayDefaults,
        }),
      setSessionId: (sessionId) => set({ gameSessionId: sessionId }),
      startMatch: ({ gameSessionId, opponent, playlist }) =>
        set({
          gameSessionId,
          status: "playing",
          opponent,
          playlist,
          ...gameplayDefaults,
          roundPhase: "topic_reveal",
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
        set({
          localUserId,
          localPlayerRole,
          isBotMatch,
          proficiencyLevel,
        }),
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
        const nextCategoryProgress = { ...state.categoryProgress };
        const category = question.category as QuestionCategory;
        const categoryStats = nextCategoryProgress[category];
        nextCategoryProgress[category] = {
          correct:
            categoryStats.correct +
            (isAnswerCorrect(localAnswer, question.correct_answer) ? 1 : 0),
          total: categoryStats.total + 1,
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
      reset: () => set({ ...initialState, hasHydrated: true }),
    }),
    {
      name: "language-quiz-game",
      partialize: (state) => ({
        gameSessionId: state.gameSessionId,
        status: state.status,
        opponent: state.opponent,
        playlist: state.playlist,
        currentQuestionIndex: state.currentQuestionIndex,
        playerAScore: state.playerAScore,
        playerBScore: state.playerBScore,
        isBotMatch: state.isBotMatch,
        roundPhase: state.roundPhase,
        localPlayerRole: state.localPlayerRole,
        localUserId: state.localUserId,
        proficiencyLevel: state.proficiencyLevel,
        playerAAnswer: state.playerAAnswer,
        playerBAnswer: state.playerBAnswer,
        playerAResponseTimes: state.playerAResponseTimes,
        playerBResponseTimes: state.playerBResponseTimes,
        roundStartedAt: state.roundStartedAt,
        timeRemaining: state.timeRemaining,
        lastRoundPointsA: state.lastRoundPointsA,
        lastRoundPointsB: state.lastRoundPointsB,
        matchWinner: state.matchWinner,
        categoryProgress: state.categoryProgress,
        matchSaved: state.matchSaved,
        tiebreakerQuestion: state.tiebreakerQuestion,
        tiebreakerUsed: state.tiebreakerUsed,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
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
