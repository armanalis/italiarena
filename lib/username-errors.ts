import {
  normalizeUsername,
  validateUsername,
} from "./username";

export const USERNAME_TAKEN_MESSAGE = "That username is already taken.";

export function isUniqueUsernameConstraintError(error: {
  message?: string;
  code?: string;
}): boolean {
  if (error.code === "23505") {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("users_display_name_unique") ||
    message.includes("duplicate key") ||
    message.includes("already exists")
  );
}

export function mapUsernameSaveError(error: {
  message?: string;
  code?: string;
}): string {
  if (isUniqueUsernameConstraintError(error)) {
    return USERNAME_TAKEN_MESSAGE;
  }

  return error.message ?? "Could not save username.";
}

export function usernameValidationError(value: string): string | null {
  return validateUsername(normalizeUsername(value));
}
