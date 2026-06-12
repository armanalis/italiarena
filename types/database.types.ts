/**
 * TypeScript shapes for Supabase tables and RPCs.
 * Use these types to keep the app and database in sync.
 */

import type { ProficiencyLevel, TargetLanguage } from "@/lib/constants";

// Columns that only accept a fixed set of string values
export type QuestionCategory =
  | "grammar"
  | "vocabulary"
  | "fill-in-the-blank"
  | "idioms";

export type CorrectAnswer = "A" | "B" | "C" | "D";

export type MatchResult = "win" | "loss" | "tie";
export type OpponentType = "real" | "ghost";

export type ReportIssueType = "typo" | "wrong_answer" | "unnatural_phrasing";

export type GameSessionStatus =
  | "waiting"
  | "active"
  | "completed"
  | "abandoned";

export type QuestionLevel = ProficiencyLevel;
export type QuestionLanguage = TargetLanguage;

// One row per player — tracks match results and category accuracy
export interface PlayerStats {
  user_id: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  grammar_correct: number;
  grammar_total: number;
  vocab_correct: number;
  vocab_total: number;
  fill_blank_correct: number;
  fill_blank_total: number;
  idioms_correct: number;
  idioms_total: number;
  seen_questions: string[];
}

// A trivia question from the live pool
export interface QuestionActive {
  id: string;
  language: QuestionLanguage;
  level: QuestionLevel;
  category: QuestionCategory;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
  random_float: number;
}

// Same as QuestionActive, but pulled from the flagged/review queue
export interface QuestionFlagged extends QuestionActive {
  report_count: number;
}

// A question the user got wrong — tracked for review and practice
export interface UserMistake {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: CorrectAnswer | null;
  practice_streak: number;
  last_mistaken_at: string;
  session_id: string | null;
}

export type UserMistakeInsert = Pick<
  UserMistake,
  "user_id" | "question_id"
> &
  Partial<
    Pick<
      UserMistake,
      "id" | "selected_answer" | "practice_streak" | "last_mistaken_at" | "session_id"
    >
  >;

// A completed match summary for history and statistics
export interface MatchHistory {
  id: string;
  user_id: string;
  session_id: string | null;
  opponent_type: OpponentType;
  opponent_display_name: string;
  user_score: number;
  opponent_score: number;
  result: MatchResult;
  language: QuestionLanguage;
  level: QuestionLevel;
  played_at: string;
}

// Community question waiting for admin review
export type QuestionSubmissionStatus = "pending" | "approved" | "rejected";

export type QuestionSubmissionAiPrecheckStatus =
  | "pending"
  | "ready"
  | "unavailable";

export type QuestionSubmissionAiRecommendation =
  | "approve"
  | "review_carefully"
  | "likely_reject";

export interface QuestionSubmission {
  id: string;
  submitter_id: string;
  language: QuestionLanguage;
  level: QuestionLevel;
  category: QuestionCategory;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
  rationale: string | null;
  status: QuestionSubmissionStatus;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  ai_precheck_status: QuestionSubmissionAiPrecheckStatus | null;
  ai_precheck_recommendation: QuestionSubmissionAiRecommendation | null;
  ai_precheck_summary: string | null;
  ai_precheck_details: Record<string, unknown> | null;
  ai_precheck_at: string | null;
  created_at: string;
}

export type QuestionSubmissionInsert = Pick<
  QuestionSubmission,
  | "submitter_id"
  | "language"
  | "level"
  | "category"
  | "question_text"
  | "option_a"
  | "option_b"
  | "option_c"
  | "option_d"
  | "correct_answer"
> &
  Partial<
    Pick<QuestionSubmission, "id" | "rationale" | "status" | "created_at">
  >;

export type QuestionSubmissionUpdate = Partial<
  Pick<
    QuestionSubmission,
    | "status"
    | "reviewer_id"
    | "reviewer_notes"
    | "reviewed_at"
    | "level"
    | "category"
    | "question_text"
    | "option_a"
    | "option_b"
    | "option_c"
    | "option_d"
    | "correct_answer"
    | "rationale"
  >
>;

// A player-submitted issue report against an active question
export interface Report {
  id: string;
  question_id: string;
  reporter_id: string;
  issue_type: ReportIssueType;
  created_at: string;
}

// A 1v1 match between two players
export interface GameSession {
  id: string;
  player_a_id: string;
  player_b_id: string | null;
  status: GameSessionStatus;
  question_playlist: string[];
  language: QuestionLanguage | null;
  level: QuestionLevel | null;
  /** Player A's locked answer for the current round (MatchAnswerRecord JSON). */
  answer_a: unknown;
  /** Player B's locked answer for the current round (MatchAnswerRecord JSON). */
  answer_b: unknown;
  created_at: string;
}

// One answer inside a saved ghost match replay
export interface GhostMatchAnswer {
  question_id: string;
  selected_answer: CorrectAnswer;
  is_correct: boolean;
  answered_at: string;
}

// Full replay payload stored in ghost_matches.match_data
export interface GhostMatchData {
  answers: GhostMatchAnswer[];
  final_score?: number;
  duration_ms?: number;
}

// A recorded match that can be replayed as a ghost opponent
export interface GhostMatch {
  id: string;
  original_player_id: string;
  language: QuestionLanguage;
  level: QuestionLevel;
  match_data: GhostMatchData;
  created_at: string;
}

// Partial types for inserts and updates — only required fields are enforced
export type PlayerStatsInsert = Pick<PlayerStats, "user_id"> &
  Partial<Omit<PlayerStats, "user_id">>;

export type PlayerStatsUpdate = Partial<Omit<PlayerStats, "user_id">>;

export type QuestionActiveInsert = Omit<QuestionActive, "id" | "random_float"> &
  Partial<Pick<QuestionActive, "id" | "random_float">>;

export type QuestionFlaggedInsert = Omit<
  QuestionFlagged,
  "id" | "random_float" | "report_count"
> &
  Partial<Pick<QuestionFlagged, "id" | "random_float" | "report_count">>;

export type ReportInsert = Pick<Report, "question_id" | "reporter_id" | "issue_type"> &
  Partial<Pick<Report, "id" | "created_at">>;

export type MatchHistoryInsert = Pick<
  MatchHistory,
  | "user_id"
  | "opponent_type"
  | "opponent_display_name"
  | "user_score"
  | "opponent_score"
  | "result"
  | "language"
  | "level"
> &
  Partial<Pick<MatchHistory, "id" | "session_id" | "played_at">>;

export type GameSessionInsert = Pick<GameSession, "player_a_id"> &
  Partial<
    Pick<
      GameSession,
      "id" | "player_b_id" | "status" | "question_playlist" | "created_at"
    >
  >;

export type GameSessionUpdate = Partial<
  Pick<GameSession, "player_b_id" | "status" | "question_playlist">
>;

export type GhostMatchInsert = Pick<
  GhostMatch,
  "original_player_id" | "language" | "level" | "match_data"
> &
  Partial<Pick<GhostMatch, "id" | "created_at">>;

// Arguments passed to Postgres RPC functions
export type GetRandomQuestionsArgs = {
  p_language: QuestionLanguage;
  p_level: QuestionLevel;
  p_user_id: string;
};

export type GetTiebreakerQuestionArgs = {
  p_language: QuestionLanguage;
  p_level: QuestionLevel;
  p_user_id: string;
  p_exclude_ids: string[];
};

export type UpdateSeenQuestionsArgs = {
  p_user_id: string;
  p_question_ids: string[];
};

// Full schema map for a typed Supabase client
export interface Database {
  public: {
    Tables: {
      player_stats: {
        Row: PlayerStats;
        Insert: PlayerStatsInsert;
        Update: PlayerStatsUpdate;
        Relationships: [];
      };
      questions_active: {
        Row: QuestionActive;
        Insert: QuestionActiveInsert;
        Update: Partial<QuestionActiveInsert>;
        Relationships: [];
      };
      questions_flagged: {
        Row: QuestionFlagged;
        Insert: QuestionFlaggedInsert;
        Update: Partial<QuestionFlaggedInsert>;
        Relationships: [];
      };
      reports: {
        Row: Report;
        Insert: ReportInsert;
        Update: Partial<ReportInsert>;
        Relationships: [];
      };
      question_submissions: {
        Row: QuestionSubmission;
        Insert: QuestionSubmissionInsert;
        Update: QuestionSubmissionUpdate;
        Relationships: [];
      };
      match_history: {
        Row: MatchHistory;
        Insert: MatchHistoryInsert;
        Update: Partial<MatchHistoryInsert>;
        Relationships: [];
      };
      user_mistakes: {
        Row: UserMistake;
        Insert: UserMistakeInsert;
        Update: Partial<UserMistakeInsert>;
        Relationships: [];
      };
      game_sessions: {
        Row: GameSession;
        Insert: GameSessionInsert;
        Update: GameSessionUpdate;
        Relationships: [];
      };
      ghost_matches: {
        Row: GhostMatch;
        Insert: GhostMatchInsert;
        Update: Partial<GhostMatchInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_random_questions: {
        Args: GetRandomQuestionsArgs;
        Returns: QuestionActive[];
      };
      get_tiebreaker_question: {
        Args: GetTiebreakerQuestionArgs;
        Returns: QuestionActive | null;
      };
      update_seen_questions: {
        Args: UpdateSeenQuestionsArgs;
        Returns: void;
      };
      delete_own_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      resolve_login_email: {
        Args: { p_identifier: string };
        Returns: string | null;
      };
      is_display_name_taken: {
        Args: { p_display_name: string; p_exclude_user_id?: string | null };
        Returns: boolean;
      };
      get_public_display_name: {
        Args: { p_user_id: string };
        Returns: string | null;
      };
      get_server_time_ms: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
