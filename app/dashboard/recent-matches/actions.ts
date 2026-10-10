"use server";

import { getAuthUserId } from "@/lib/auth";
import { cachedDashboardQuery, dashboardTag } from "@/lib/dashboard-cache";
import {
  isMatchScoreState,
  scoreStateForRole,
  type MatchRoundReview,
} from "@/lib/match-score-state";
import { extractQuestionIds } from "@/lib/session-playlist";
import { REGULAR_MATCH_QUESTIONS } from "@/lib/match";
import {
  getOptionText,
  normalizeQuestionCategory,
} from "@/lib/resolve-match-questions";
import { resolveQuestionsWithAnswers } from "@/lib/questions-with-answers";
import { createClient } from "@/utils/supabase/server";
import type {
  CorrectAnswer,
  MatchHistory,
  MatchResult,
  OpponentType,
} from "@/types/database.types";

export type RecentMatchQuestionOption = {
  key: CorrectAnswer;
  text: string;
};

export type RecentMatchQuestion = {
  questionIndex: number;
  questionId: string;
  category: string;
  questionText: string;
  correctAnswer: CorrectAnswer;
  options: RecentMatchQuestionOption[];
  /** The player's pick; null when they ran out of time. */
  selectedAnswer: CorrectAnswer | null;
  wasCorrect: boolean;
};

const OPTION_KEYS: CorrectAnswer[] = ["A", "B", "C", "D"];

export type RecentMatchWithQuestions = {
  id: string;
  sessionId: string | null;
  playedAt: string;
  opponentDisplayName: string;
  opponentType: OpponentType;
  userScore: number;
  opponentScore: number;
  result: MatchResult;
  language: string;
  level: string;
  questions: RecentMatchQuestion[];
};

export type RecentMatchesData = {
  matches: RecentMatchWithQuestions[];
  reportedQuestionIds: string[];
};

export async function getRecentMatchesWithQuestions(): Promise<RecentMatchesData> {
  const userId = await getAuthUserId();

  if (!userId) {
    return { matches: [], reportedQuestionIds: [] };
  }

  return cachedDashboardQuery(
    ["recent-matches", userId],
    dashboardTag(userId, "recent-matches"),
    () => fetchRecentMatchesWithQuestions(userId)
  );
}

async function fetchRecentMatchesWithQuestions(
  userId: string
): Promise<RecentMatchesData> {
  const supabase = await createClient();

  const { data: reportRows } = await supabase
    .from("reports")
    .select("question_id")
    .eq("reporter_id", userId);

  const reportedQuestionIds = [
    ...new Set(
      (reportRows ?? []).map((row) => row.question_id).filter(Boolean)
    ),
  ];

  const { data: historyRows, error: historyError } = await supabase
    .from("match_history")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(10);

  if (historyError || !historyRows?.length) {
    return { matches: [], reportedQuestionIds };
  }

  const history = historyRows as MatchHistory[];
  const sessionIds = history
    .map((row) => row.session_id)
    .filter((id): id is string => Boolean(id));

  const sessionPlaylists = new Map<string, string[]>();
  // This player's own pick per question, as scored on the server. (Inferring
  // it from user_mistakes was wrong once practice or a later match changed
  // that table.)
  const reviewsBySession = new Map<string, Map<string, MatchRoundReview>>();

  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from("game_sessions")
      .select("id, question_playlist, score_state, player_a_id")
      .in("id", sessionIds);

    for (const session of sessions ?? []) {
      const ids = extractQuestionIds(session.question_playlist).slice(
        0,
        REGULAR_MATCH_QUESTIONS
      );
      sessionPlaylists.set(session.id, ids);

      if (isMatchScoreState(session.score_state)) {
        const role = session.player_a_id === userId ? "a" : "b";
        const reviews = scoreStateForRole(session.score_state, role).roundReviews;
        reviewsBySession.set(
          session.id,
          new Map(reviews.map((round) => [round.questionId, round]))
        );
      }
    }
  }

  // Played rounds only: a forfeit leaves later questions unanswered, and
  // their answers must not be shown.
  const playedQuestionIds = [
    ...new Set(
      [...reviewsBySession.values()].flatMap((reviews) => [...reviews.keys()])
    ),
  ];
  const questionsById = await resolveQuestionsWithAnswers(playedQuestionIds);

  const matches = history.map((row) => {
    const questionIds = row.session_id
      ? (sessionPlaylists.get(row.session_id) ?? [])
      : [];
    const sessionReviews = row.session_id
      ? reviewsBySession.get(row.session_id)
      : undefined;

    const questions: RecentMatchQuestion[] = questionIds.flatMap(
      (questionId, index) => {
        const question = questionsById.get(questionId);
        // No review = the round was never played (e.g. a forfeit).
        const review = sessionReviews?.get(questionId);
        if (!question || !review) {
          return [];
        }

        const options = OPTION_KEYS.map((key) => ({
          key,
          text: getOptionText(question, key),
        }));

        return [
          {
            questionIndex: index,
            questionId: question.id,
            category: normalizeQuestionCategory(question.category),
            questionText: question.question_text,
            correctAnswer: question.correct_answer,
            options,
            selectedAnswer: review.selectedAnswer,
            wasCorrect: review.wasCorrect,
          },
        ];
      }
    );

    return {
      id: row.id,
      sessionId: row.session_id,
      playedAt: row.played_at,
      opponentDisplayName: row.opponent_display_name,
      opponentType: row.opponent_type,
      userScore: row.user_score,
      opponentScore: row.opponent_score,
      result: row.result,
      language: row.language,
      level: row.level,
      questions,
    };
  });

  return { matches, reportedQuestionIds };
}
