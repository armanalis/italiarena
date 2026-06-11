import { isMatchSyncState, type MatchSyncState } from "@/lib/match-sync";

export type SessionPlaylistData = {
  questionIds: string[];
  sync: MatchSyncState | null;
};

/** Supports legacy `string[]` playlists and `{ questionIds, sync }` objects. */
export function parseQuestionPlaylist(raw: unknown): SessionPlaylistData {
  if (Array.isArray(raw)) {
    return {
      questionIds: raw.filter((id): id is string => typeof id === "string"),
      sync: null,
    };
  }

  if (raw && typeof raw === "object" && "questionIds" in raw) {
    const record = raw as { questionIds?: unknown; sync?: unknown };
    const questionIds = Array.isArray(record.questionIds)
      ? record.questionIds.filter((id): id is string => typeof id === "string")
      : [];
    const sync = isMatchSyncState(record.sync) ? record.sync : null;
    return { questionIds, sync };
  }

  return { questionIds: [], sync: null };
}

export function buildQuestionPlaylistPayload(
  questionIds: string[],
  sync: MatchSyncState | null = null
) {
  return { questionIds, sync };
}

export function extractQuestionIds(raw: unknown): string[] {
  return parseQuestionPlaylist(raw).questionIds;
}
