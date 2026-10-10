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
 * service role may call it (see supabase/security-hardening-2026-10.sql).
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

async function lookupEmailViaAdmin(username: string): Promise<string | null> {
  const admin = createAdminClientOrNull();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("users")
    .select("email, display_name")
    .ilike("display_name", username)
    .limit(10)
    .returns<{ email: string; display_name: string | null }[]>();

  if (error || !data?.length) {
    return null;
  }

  // ilike treats % and _ as wildcards; only accept an exact case-insensitive match.
  const wanted = username.trim().toLowerCase();
  return (
    data.find((row) => row.display_name?.trim().toLowerCase() === wanted)
      ?.email ?? null
  );
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
    const email = (await lookupEmailViaRpc(trimmed)) ?? (await lookupEmailViaAdmin(trimmed));

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

async function isUsernameTakenViaLoginLookup(
  username: string,
  excludeUserId?: string
): Promise<boolean | null> {
  try {
    const email = await lookupEmailViaRpc(username);
    if (!email) {
      return false;
    }

    if (!excludeUserId) {
      return true;
    }

    const supabase = await createClient();
    const { data: currentUser, error } = await supabase
      .from("users")
      .select("email")
      .eq("id", excludeUserId)
      .maybeSingle();

    if (error || !currentUser?.email) {
      return true;
    }

    return email.toLowerCase() !== currentUser.email.toLowerCase();
  } catch {
    return null;
  }
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

async function isUsernameTakenViaAdmin(
  username: string,
  excludeUserId?: string
): Promise<boolean | null> {
  const admin = createAdminClientOrNull();
  if (!admin) {
    return null;
  }

  let query = admin.from("users").select("id").ilike("display_name", username).limit(1);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    return null;
  }

  return Boolean(data?.length);
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

  const viaRpc = await isUsernameTakenViaRpc(trimmed, excludeUserId);
  if (viaRpc !== null) {
    return viaRpc;
  }

  const viaLookup = await isUsernameTakenViaLoginLookup(trimmed, excludeUserId);
  if (viaLookup !== null) {
    return viaLookup;
  }

  const viaAdmin = await isUsernameTakenViaAdmin(trimmed, excludeUserId);
  return viaAdmin ?? false;
}
