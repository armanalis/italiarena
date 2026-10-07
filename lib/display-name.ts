import type { UserProfile } from "@/lib/types";

function isGuestProfile(profile: { email: string; is_guest?: boolean }) {
  const localPart = profile.email.split("@")[0]?.trim();
  return Boolean(
    profile.is_guest || (localPart && /^guest-[0-9a-f-]+$/i.test(localPart))
  );
}

/**
 * Name shown to other players (matches, leaderboard). Never derived from the
 * email: the local part often is the player's real name or reveals the address.
 * Mirrors get_public_display_name / get_leaderboard in the database.
 */
export function getPublicDisplayName(profile: {
  display_name?: string | null;
  email: string;
  is_guest?: boolean;
}): string {
  const trimmed = profile.display_name?.trim();
  if (trimmed) {
    return trimmed;
  }

  return isGuestProfile(profile) ? "Guest" : "Player";
}

/** Name shown to the signed-in player themself (site header). */
export function formatDisplayName(profile: UserProfile) {
  const trimmed = profile.display_name?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (isGuestProfile(profile)) {
    return "Guest";
  }

  return profile.email.split("@")[0]?.trim() || "Player";
}
