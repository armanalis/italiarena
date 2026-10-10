/** Server Actions for email/password sign in, sign up, and sign out. */
"use server";

import { redirect } from "next/navigation";
import { getPostAuthPath } from "@/lib/auth";
import { EXISTING_EMAIL_MESSAGE, isEmailRegistered } from "@/lib/auth-email-lookup";
import {
  isUsernameTaken,
  normalizeUsername,
  resolveLoginEmail,
  validateUsername,
} from "@/lib/username";
import { USERNAME_TAKEN_MESSAGE } from "@/lib/username-errors";
import { CONNECTION_ERROR_MESSAGE, isConnectionError } from "@/lib/errors";
import { validateNewPassword } from "@/lib/password-rules";
import {
  getServerAuthCallbackUrl,
} from "@/lib/site-url-server";
import { createClient } from "@/utils/supabase/server";

export type AuthFormState = {
  error: string | null;
  success?: string | null;
  redirectTo?: string | null;
};

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
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Please confirm your email first. Check your inbox and spam folder, or use \"Resend verification email\" below.",
      };
    }

    if (isConnectionError(error)) {
      return { error: CONNECTION_ERROR_MESSAGE };
    }

    return { error: error.message };
  }

  return { error: null, redirectTo: await getPostAuthPath() };
}

export async function validateSignUpInput(formData: FormData): Promise<AuthFormState> {
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

  const passwordRules = validateNewPassword(password);
  if (!passwordRules.ok) {
    return { error: passwordRules.error };
  }

  if (await isEmailRegistered(email)) {
    return { error: EXISTING_EMAIL_MESSAGE };
  }

  if (await isUsernameTaken(username)) {
    return { error: USERNAME_TAKEN_MESSAGE };
  }

  return { error: null };
}

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await getServerAuthCallbackUrl("/login/reset-password"),
  });

  if (error) {
    return { error: error.message, success: null };
  }

  return {
    error: null,
    // Same answer either way, so the form cannot reveal who has an account.
    success: "If that email has an account, we sent a reset link. Check your inbox.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
