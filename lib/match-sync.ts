import type { QuestionActive } from "@/types/database.types";

export const MATCH_SYNC_EVENT = "match_sync";

export type MatchSyncPayload =
  | { type: "peer_ready"; playerRole: "a" | "b" }
  | { type: "request_sync" }
  | {
      type: "topic_reveal";
      questionIndex: number;
      at: number;
      playlistSig: string;
    }
  | {
      type: "round_playing";
      questionIndex: number;
      startedAt: number;
      playlistSig: string;
    }
  | { type: "tiebreaker"; question: QuestionActive; playlistSig: string }
  | { type: "match_finished" };

export function isMatchSyncPayload(value: unknown): value is MatchSyncPayload {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  const payload = value as MatchSyncPayload;

  switch (payload.type) {
    case "peer_ready":
      return payload.playerRole === "a" || payload.playerRole === "b";
    case "request_sync":
      return true;
    case "topic_reveal":
      return (
        typeof payload.questionIndex === "number" &&
        typeof payload.at === "number" &&
        typeof payload.playlistSig === "string"
      );
    case "round_playing":
      return (
        typeof payload.questionIndex === "number" &&
        typeof payload.startedAt === "number" &&
        typeof payload.playlistSig === "string"
      );
    case "tiebreaker":
      return (
        Boolean(payload.question?.id && payload.question?.question_text) &&
        typeof payload.playlistSig === "string"
      );
    case "match_finished":
      return true;
    default:
      return false;
  }
}

export function playlistIdsSignature(playlist: QuestionActive[]): string {
  return playlist.map((question) => question.id).join("|");
}
