import { isMatchSyncState, type MatchSyncState } from "@/lib/match-sync";
import type { PublicQuestion } from "@/types/database.types";

export type SessionPlaylistData = {
  questionIds: string[];
  sync: MatchSyncState | null;
  /**
   * Question rows (without answers) for ids appended mid-match by
   * append_tiebreaker_question. Both clients read this from the same poll so
   * the follower does not need a separate refetch before entering the round.
   */
  questionBank: Record<string, PublicQuestion>;
};

function isPublicQuestion(value: unknown): value is PublicQuestion {
  if (!value || typeof value !== "object") {
    return false;
  }

  const question = value as PublicQuestion;
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
    typeof question.random_float === "number"
  );
}

function parseQuestionBank(raw: unknown): Record<string, PublicQuestion> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const bank: Record<string, PublicQuestion> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (isPublicQuestion(value) && value.id === id) {
      // Older sessions stored full rows; never pass an answer on to the client.
      const { correct_answer: _answer, ...question } = value as PublicQuestion & {
        correct_answer?: unknown;
      };
      bank[id] = question;
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

/** Initial playlist for a new session (server only; players cannot write it). */
export function buildQuestionPlaylistPayload(questionIds: string[]) {
  return { questionIds, sync: null };
}

export function extractQuestionIds(raw: unknown): string[] {
  return parseQuestionPlaylist(raw).questionIds;
}
