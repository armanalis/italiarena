"use server";

import { getAuthUserId } from "@/lib/auth";
import { extractQuestionIds } from "@/lib/session-playlist";
import { REGULAR_MATCH_QUESTIONS } from "@/lib/match";
import {
  getOptionText,
  normalizeQuestionCategory,
  resolveQuestionsByIds,
} from "@/lib/resolve-match-questions";
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
  /** User's pick when wrong; inferred as the correct key when right. */
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

  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from("game_sessions")
      .select("id, question_playlist")
      .in("id", sessionIds);

    for (const session of sessions ?? []) {
      const ids = extractQuestionIds(session.question_playlist).slice(
        0,
        REGULAR_MATCH_QUESTIONS
      );
      sessionPlaylists.set(session.id, ids);
    }
  }

  const allQuestionIds = [
    ...new Set([...sessionPlaylists.values()].flat()),
  ];

  const questionsById = await resolveQuestionsByIds(supabase, allQuestionIds);

  const mistakesBySession = new Map<
    string,
    Map<string, CorrectAnswer | null>
  >();

  if (sessionIds.length > 0) {
    const { data: mistakes } = await supabase
      .from("user_mistakes")
      .select("session_id, question_id, selected_answer")
      .eq("user_id", userId)
      .in("session_id", sessionIds);

    for (const mistake of mistakes ?? []) {
      if (!mistake.session_id) {
        continue;
      }
      let sessionMistakes = mistakesBySession.get(mistake.session_id);
      if (!sessionMistakes) {
        sessionMistakes = new Map();
        mistakesBySession.set(mistake.session_id, sessionMistakes);
      }
      sessionMistakes.set(
        mistake.question_id,
        mistake.selected_answer as CorrectAnswer | null
      );
    }
  }

  const matches = history.map((row) => {
    const questionIds = row.session_id
      ? (sessionPlaylists.get(row.session_id) ?? [])
      : [];
    const sessionMistakes = row.session_id
      ? mistakesBySession.get(row.session_id)
      : undefined;

    const questions: RecentMatchQuestion[] = questionIds.flatMap(
      (questionId, index) => {
        const question = questionsById.get(questionId);
        if (!question) {
          return [];
        }

        const mistakeAnswer = sessionMistakes?.get(questionId);
        const wasCorrect = !sessionMistakes?.has(questionId);
        const selectedAnswer = wasCorrect
          ? question.correct_answer
          : (mistakeAnswer ?? null);
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
            selectedAnswer,
            wasCorrect,
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
