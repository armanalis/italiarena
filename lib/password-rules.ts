/** Shared password rules for sign-up, reset, and settings. */

export const PASSWORD_MIN_LENGTH = 6;

export const PASSWORD_RULES_SUMMARY = `At least ${PASSWORD_MIN_LENGTH} characters`;

export const SAME_PASSWORD_MESSAGE =
  "You can't use your existing password. Please enter a NEW password.";

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Validate a new password (and optional confirm field). */
export function validateNewPassword(
  password: string,
  confirmPassword?: string
): PasswordValidationResult {
  if (!password) {
    return { ok: false, error: "Password is required." };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }

  if (confirmPassword !== undefined) {
    if (!confirmPassword) {
      return { ok: false, error: "Please re-enter your new password." };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: "Passwords do not match." };
    }
  }

  return { ok: true };
}

export function isSamePasswordError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("different from the old password") ||
    normalized.includes("should be different") ||
    normalized.includes("same as the old") ||
    normalized.includes("same password") ||
    normalized.includes("identical to") ||
    normalized.includes("must be different")
  );
}

export function isSessionMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("auth session missing") ||
    normalized.includes("session missing") ||
    normalized.includes("not authenticated") ||
    normalized.includes("jwt expired") ||
    normalized.includes("invalid jwt")
  );
}
