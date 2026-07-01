import { getClientEmailRedirectUrl } from "@/lib/site-url";
import { createClient } from "@/utils/supabase/client";

const VERIFICATION_SENT_MESSAGE =
  "Verification email sent. Check your inbox to confirm your account, then sign in.";

export type SignUpProfilePayload = {
  userId: string;
  email: string;
  username: string;
};

export type ClientSignUpResult =
  | { ok: true; message: string; profile: SignUpProfilePayload | null; redirectTo?: string }
  | { ok: false; error: string };

async function sendSignupVerificationEmail(email: string) {
  const supabase = createClient();
  const emailRedirectTo = getClientEmailRedirectUrl("/onboarding");

  return supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });
}

export async function signUpOnClient(params: {
  email: string;
  password: string;
  username: string;
}): Promise<ClientSignUpResult> {
  const email = params.email.trim();
  const password = params.password;
  const username = params.username.trim();
  const supabase = createClient();
  const emailRedirectTo = getClientEmailRedirectUrl("/onboarding");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        pending_display_name: username,
      },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (data.session && data.user) {
    return {
      ok: true,
      message: VERIFICATION_SENT_MESSAGE,
      profile: { userId: data.user.id, email, username },
      redirectTo: "/onboarding",
    };
  }

  if (data.user?.identities?.length === 0) {
    const { error: resendError } = await sendSignupVerificationEmail(email);

    if (resendError) {
      return {
        ok: false,
        error:
          "An account with this email already exists. Try signing in, or resend the verification email.",
      };
    }

    return {
      ok: true,
      message: VERIFICATION_SENT_MESSAGE,
      profile: null,
    };
  }

  if (!data.user) {
    return { ok: false, error: "Could not create account. Please try again." };
  }

  return {
    ok: true,
    message: VERIFICATION_SENT_MESSAGE,
    profile: { userId: data.user.id, email, username },
  };
}

export async function resendVerificationOnClient(
  email: string
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const trimmed = email.trim();

  if (!trimmed) {
    return { ok: false, error: "Email is required." };
  }

  const { error } = await sendSignupVerificationEmail(trimmed);

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    message: "Verification email sent. Check your inbox for a new confirmation link.",
  };
}
