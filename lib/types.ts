import type { ProficiencyLevel, TargetLanguage } from "@/lib/constants";

export type UserRole = "user" | "admin";

/** Shape of a row from the public.users table. */
export type UserProfile = {
  id: string;
  email: string;
  display_name: string | null;
  target_language: TargetLanguage | null;
  proficiency_level: ProficiencyLevel | null;
  role: UserRole;
  sound_enabled: boolean;
  haptics_enabled: boolean;
};

export type MatchHistoryEntry = {
  id: string;
  session_id: string | null;
  opponent_type: "real" | "ghost";
  opponent_display_name: string;
  user_score: number;
  opponent_score: number;
  result: "win" | "loss" | "tie";
  language: string;
  level: string;
  played_at: string;
};

export type CategoryProgress = {
  grammar: { correct: number; total: number };
  vocabulary: { correct: number; total: number };
  "fill-in-the-blank": { correct: number; total: number };
  idioms: { correct: number; total: number };
};
