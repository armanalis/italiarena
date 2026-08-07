import { isMatchSyncState, type MatchSyncState } from "@/lib/match-sync";
import type { QuestionActive } from "@/types/database.types";

export type SessionPlaylistData = {
  questionIds: string[];
  sync: MatchSyncState | null;
  /**
   * Full question rows for ids appended mid-match (sudden-death tiebreaker).
   * Both clients read this from the same poll so the follower does not need a
   * separate server-action refetch before entering the round.
   */
  questionBank: Record<string, QuestionActive>;
};

function isQuestionActive(value: unknown): value is QuestionActive {
  if (!value || typeof value !== "object") {
    return false;
  }

  const question = value as QuestionActive;
  return (
    typeof question.id === "string" &&
    typeof question.language === "string" &&
    typeof question.level === "string" &&
    typeof question.category === "string" &&
    typeof question.question_text === "string" &&
    typeof question.option_a === "string" &&
    typeof question.option_b === "string" &&
    typeof question.option_c === "string" &&
    typeof question.option_d === "string" &&
    (question.correct_answer === "A" ||
      question.correct_answer === "B" ||
      question.correct_answer === "C" ||
      question.correct_answer === "D") &&
    typeof question.random_float === "number"
  );
}

function parseQuestionBank(raw: unknown): Record<string, QuestionActive> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const bank: Record<string, QuestionActive> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (isQuestionActive(value) && value.id === id) {
      bank[id] = value;
    }
  }
  return bank;
}

/** Supports legacy `string[]` playlists and `{ questionIds, sync }` objects. */
export function parseQuestionPlaylist(raw: unknown): SessionPlaylistData {
  if (Array.isArray(raw)) {
    return {
      questionIds: raw.filter((id): id is string => typeof id === "string"),
      sync: null,
      questionBank: {},
    };
  }

  if (raw && typeof raw === "object" && "questionIds" in raw) {
    const record = raw as {
      questionIds?: unknown;
      sync?: unknown;
      questionBank?: unknown;
    };
    const questionIds = Array.isArray(record.questionIds)
      ? record.questionIds.filter((id): id is string => typeof id === "string")
      : [];
    const sync = isMatchSyncState(record.sync) ? record.sync : null;
    return {
      questionIds,
      sync,
      questionBank: parseQuestionBank(record.questionBank),
    };
  }

  return { questionIds: [], sync: null, questionBank: {} };
}

export function buildQuestionPlaylistPayload(
  questionIds: string[],
  sync: MatchSyncState | null = null,
  questionBank: Record<string, QuestionActive> = {}
) {
  const bankEntries = Object.entries(questionBank).filter(
    ([id, question]) => questionIds.includes(id) && isQuestionActive(question)
  );

  if (bankEntries.length === 0) {
    return { questionIds, sync };
  }

  return {
    questionIds,
    sync,
    questionBank: Object.fromEntries(bankEntries),
  };
}

export function extractQuestionIds(raw: unknown): string[] {
  return parseQuestionPlaylist(raw).questionIds;
}
