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

/** Email/password accounts must confirm before accessing the app. */
export function isEmailVerifiedUser(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
}): boolean {
  if (isGuestAuthUser(user)) {
    return true;
  }

  return Boolean(user.email_confirmed_at);
}
