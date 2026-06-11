import { createAdminClient } from "@/utils/supabase/admin";

export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 24;

export function isEmailIdentifier(value: string): boolean {
  return value.includes("@");
}

export function normalizeUsername(value: string): string {
  return value.trim();
}

export function validateUsername(value: string): string | null {
  const trimmed = normalizeUsername(value);

  if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters.`;
  }

  return null;
}

function getAdminClientOrNull() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** Case-insensitive lookup — always reads the current display_name from the database. */
export async function findUserEmailByUsername(
  username: string
): Promise<{ email: string } | { error: string }> {
  const trimmed = normalizeUsername(username);
  const validationError = validateUsername(trimmed);

  if (validationError) {
    return { error: validationError };
  }

  const admin = getAdminClientOrNull();
  if (!admin) {
    return { error: "Sign-in is temporarily unavailable. Please try again later." };
  }

  const { data, error } = await admin
    .from("users")
    .select("email")
    .ilike("display_name", trimmed)
    .limit(2)
    .returns<{ email: string }[]>();

  if (error) {
    return { error: error.message };
  }

  if (!data?.length) {
    return { error: "No account found for that username." };
  }

  if (data.length > 1) {
    return {
      error: "That username matches multiple accounts. Sign in with your email instead.",
    };
  }

  return { email: data[0].email };
}

export async function resolveLoginEmail(
  identifier: string
): Promise<{ email: string } | { error: string }> {
  const trimmed = identifier.trim();

  if (!trimmed) {
    return { error: "Email or username is required." };
  }

  if (isEmailIdentifier(trimmed)) {
    return { email: trimmed };
  }

  return findUserEmailByUsername(trimmed);
}

export async function isUsernameTaken(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const trimmed = normalizeUsername(username);
  const validationError = validateUsername(trimmed);

  if (validationError) {
    return false;
  }

  const admin = getAdminClientOrNull();
  if (!admin) {
    return false;
  }

  let query = admin.from("users").select("id").ilike("display_name", trimmed).limit(1);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    return false;
  }

  return Boolean(data?.length);
}
