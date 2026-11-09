import { CONNECTION_ERROR_MESSAGE, errorFromUnknown, isConnectionError } from "@/lib/errors";
import { createAdminClientOrNull } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

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

/**
 * resolve_login_email turns a public username into a private email, so only the
 * service role may call it.
 */
async function lookupEmailViaRpc(identifier: string): Promise<string | null> {
  const admin = createAdminClientOrNull();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin.rpc("resolve_login_email", {
    p_identifier: identifier,
  });

  if (error) {
    throw error;
  }

  return data;
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

  try {
    const email = await lookupEmailViaRpc(trimmed);

    if (!email) {
      return { error: "No account found for that username." };
    }

    return { email };
  } catch (error) {
    return {
      error: isConnectionError(errorFromUnknown(error))
        ? CONNECTION_ERROR_MESSAGE
        : "Could not look up that username. Please try again.",
    };
  }
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

async function isUsernameTakenViaRpc(
  username: string,
  excludeUserId?: string
): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_display_name_taken", {
    p_display_name: username,
    p_exclude_user_id: excludeUserId ?? undefined,
  });

  if (error) {
    return null;
  }

  return Boolean(data);
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

  // A failed check lets the form go on; the database's own unique rule still decides.
  return (await isUsernameTakenViaRpc(trimmed, excludeUserId)) ?? false;
}
