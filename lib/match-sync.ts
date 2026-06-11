import type { QuestionActive } from "@/types/database.types";

export const MATCH_SYNC_EVENT = "match_sync";

export type MatchSyncPayload =
  | { type: "peer_ready"; playerRole: "a" | "b" }
  | { type: "topic_reveal"; questionIndex: number; at: number }
  | { type: "round_playing"; questionIndex: number; startedAt: number }
  | { type: "round_advance"; questionIndex: number; at: number }
  | { type: "tiebreaker"; question: QuestionActive }
  | { type: "match_finished" };

export function isMatchSyncPayload(value: unknown): value is MatchSyncPayload {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  const payload = value as MatchSyncPayload;

  switch (payload.type) {
    case "peer_ready":
      return payload.playerRole === "a" || payload.playerRole === "b";
    case "topic_reveal":
    case "round_advance":
      return (
        typeof payload.questionIndex === "number" &&
        typeof payload.at === "number"
      );
    case "round_playing":
      return (
        typeof payload.questionIndex === "number" &&
        typeof payload.startedAt === "number"
      );
    case "tiebreaker":
      return Boolean(payload.question?.id && payload.question?.question_text);
    case "match_finished":
      return true;
    default:
      return false;
  }
}

export function playlistIdsSignature(playlist: QuestionActive[]): string {
  return playlist.map((question) => question.id).join("|");
}
