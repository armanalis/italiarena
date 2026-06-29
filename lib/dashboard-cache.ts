import { updateTag, unstable_cache } from "next/cache";

/** Cache tags for dashboard read queries — invalidated after match/settings changes. */
export function dashboardTag(
  userId: string,
  segment: "statistics" | "leaderboard" | "recent-matches" | "settings"
) {
  return `dashboard:${userId}:${segment}`;
}

export function revalidateUserDashboard(userId: string) {
  updateTag(dashboardTag(userId, "statistics"));
  updateTag(dashboardTag(userId, "leaderboard"));
  updateTag(dashboardTag(userId, "recent-matches"));
  updateTag(dashboardTag(userId, "settings"));
}

export function cachedDashboardQuery<T>(
  keyParts: string[],
  tag: string,
  fn: () => Promise<T>,
  revalidateSeconds = 30
) {
  return unstable_cache(fn, keyParts, {
    tags: [tag],
    revalidate: revalidateSeconds,
  })();
}
