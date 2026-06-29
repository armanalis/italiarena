/** Edge-safe guest auth helpers (no Node.js modules). */

/** Matches anonymous / disposable guest auth emails. */
export function isGuestAuthEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) {
    return false;
  }

  return /^guest-[0-9a-f-]+@guest\.local$/i.test(email.trim());
}

export function isGuestAuthUser(user: {
  email?: string | null;
  is_anonymous?: boolean;
}): boolean {
  return Boolean(user.is_anonymous) || isGuestAuthEmail(user.email);
}
