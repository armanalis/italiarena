/** Server Actions for email/password sign in, sign up, and sign out. */
"use server";

import { redirect } from "next/navigation";
import { getPostAuthPath } from "@/lib/auth";
import {
  isUsernameTaken,
  normalizeUsername,
  resolveLoginEmail,
  validateUsername,
} from "@/lib/username";
import { mapUsernameSaveError, USERNAME_TAKEN_MESSAGE } from "@/lib/username-errors";
import { getEmailAuthCallbackUrl } from "@/lib/site-url";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AuthFormState = {
  error: string | null;
  success?: string | null;
  redirectTo?: string | null;
};

const VERIFICATION_EMAIL_SENT_MESSAGE =
  "Verification email sent. Check your inbox to confirm your account, then sign in.";

function userNeedsEmailConfirmation(user: User) {
  return !user.email_confirmed_at;
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!login || !password) {
    return { error: "Email or username and password are required." };
  }

  const resolved = await resolveLoginEmail(login);
  if ("error" in resolved) {
    return { error: resolved.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: resolved.email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Please confirm your email first. Check your inbox for the verification link.",
      };
    }
    return { error: error.message };
  }

  return { error: null, redirectTo: await getPostAuthPath() };
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = normalizeUsername(String(formData.get("username") ?? ""));

  if (!email || !password || !username) {
    return { error: "Email, username, and password are required." };
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (await isUsernameTaken(username)) {
    return { error: USERNAME_TAKEN_MESSAGE };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailAuthCallbackUrl(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user?.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Try signing in instead.",
    };
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from("users")
      .update({ display_name: username })
      .eq("id", data.user.id);

    if (profileError) {
      return { error: mapUsernameSaveError(profileError) };
    }
  }

  if (data.user && userNeedsEmailConfirmation(data.user)) {
    await supabase.auth.signOut();
    return {
      error: null,
      success: VERIFICATION_EMAIL_SENT_MESSAGE,
    };
  }

  if (data.session) {
    return { error: null, redirectTo: await getPostAuthPath() };
  }

  return {
    error: null,
    success: VERIFICATION_EMAIL_SENT_MESSAGE,
  };
}

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required.", success: null };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: "Password reset is temporarily unavailable. Please try again later.",
      success: null,
    };
  }

  const { data: registeredUser, error: lookupError } = await admin
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError.message, success: null };
  }

  if (!registeredUser) {
    return {
      error: "There is no registered email for this address.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getEmailAuthCallbackUrl("/login/reset-password"),
  });

  if (error) {
    return { error: error.message, success: null };
  }

  return {
    error: null,
    success: "Password reset email sent. Check your inbox.",
  };
}

export async function resetPassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!password || !confirmPassword) {
    return { error: "Both password fields are required.", success: null };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters.", success: null };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your reset link has expired. Request a new one from the login page.",
      success: null,
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message, success: null };
  }

  return { error: null, success: null, redirectTo: await getPostAuthPath() };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
