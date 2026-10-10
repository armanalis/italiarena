"use server";

import { getAuthUserId } from "@/lib/auth";
import { cachedDashboardQuery, LEADERBOARD_TAG } from "@/lib/dashboard-cache";
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
  const userId = await getAuthUserId();

  if (!userId) {
    return {
      language,
      level,
      entries: [],
      currentUserId: null,
    };
  }

  // The ranking is the same for every viewer of a level, so it is cached once.
  const shared = await cachedDashboardQuery(
    ["leaderboard", language, level],
    LEADERBOARD_TAG,
    async () => fetchLeaderboard(language, level)
  );

  return { ...shared, currentUserId: userId };
}

async function fetchLeaderboard(
  language: string,
  level: string
): Promise<Omit<LeaderboardData, "currentUserId">> {
  const supabase = await createClient();

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
  };
}
