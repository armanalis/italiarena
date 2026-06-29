import type { UserProfile } from "@/lib/types";

/** Name shown to other players during matches. */
export function getPublicDisplayName(profile: {
  display_name?: string | null;
  email: string;
  is_guest?: boolean;
}): string {
  const trimmed = profile.display_name?.trim();
  if (trimmed) {
    return trimmed;
  }

  const localPart = profile.email.split("@")[0]?.trim();
  if (profile.is_guest || (localPart && /^guest-[0-9a-f-]+$/i.test(localPart))) {
    return "Guest";
  }

  return localPart || "Player";
}

export function formatDisplayName(profile: UserProfile) {
  return getPublicDisplayName(profile);
}
