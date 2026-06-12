"use server";

import { createClient } from "@/utils/supabase/server";

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  pvpMatches: number;
  pvpWins: number;
  winRate: number;
  totalPoints: number;
  rank: number;
};

export type LeaderboardData = {
  language: string;
  level: string;
  entries: LeaderboardEntry[];
  currentUserId: string | null;
};

export async function getLeaderboard(
  language: string,
  level: string
): Promise<LeaderboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_language: language,
    p_level: level,
    p_limit: 100,
  });

  if (error) {
    console.error(`[leaderboard] get_leaderboard failed: ${error.message}`);
    return {
      language,
      level,
      entries: [],
      currentUserId: user?.id ?? null,
    };
  }

  const rows = (data ?? []) as Array<{
    user_id: string;
    display_name: string;
    pvp_matches: number;
    pvp_wins: number;
    win_rate: number | string | null;
    total_points: number | string;
  }>;

  const entries: LeaderboardEntry[] = rows.map((row, index) => ({
    userId: row.user_id,
    displayName: row.display_name,
    pvpMatches: row.pvp_matches,
    pvpWins: row.pvp_wins,
    winRate: Number(row.win_rate ?? 0),
    totalPoints: Number(row.total_points ?? 0),
    rank: index + 1,
  }));

  return {
    language,
    level,
    entries,
    currentUserId: user?.id ?? null,
  };
}
