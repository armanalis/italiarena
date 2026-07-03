import { EXISTING_EMAIL_MESSAGE } from "@/lib/auth-email-lookup";
import { isEmailVerifiedUser } from "@/lib/guest-auth";
import {
  getClientSignupEmailRedirectOrigin,
  isLocalDevHostname,
} from "@/lib/site-url";
import { createClient } from "@/utils/supabase/client";

const VERIFICATION_SENT_MESSAGE =
  "Verification email sent. Check your inbox to confirm your account, then sign in.";

const LOCALHOST_VERIFICATION_HINT =
  " Open the link on this computer — localhost confirmation links start with http://localhost:3000/.";

const RATE_LIMIT_MESSAGE =
  "A verification email was already sent. Check your inbox and spam folder, or wait 15 seconds and use \"Resend verification email\" on the sign-in page.";

function verificationSentMessage() {
  if (
    typeof window !== "undefined" &&
    isLocalDevHostname(window.location.hostname)
  ) {
    return VERIFICATION_SENT_MESSAGE + LOCALHOST_VERIFICATION_HINT;
  }

  return VERIFICATION_SENT_MESSAGE;
}

function isRateLimitError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("security purposes") ||
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit")
  );
}

function mapSignUpError(message: string) {
  const normalized = message.toLowerCase();
  if (isRateLimitError(message)) {
    return RATE_LIMIT_MESSAGE;
  }
  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  ) {
    return EXISTING_EMAIL_MESSAGE;
  }

  return message;
}

function isDuplicateSignUp(data: {
  user: { identities?: { id: string }[] } | null;
}) {
  return !data.user || data.user.identities?.length === 0;
}

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
  const emailRedirectTo = getClientSignupEmailRedirectOrigin();

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
  const emailRedirectTo = getClientSignupEmailRedirectOrigin();

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
    if (isRateLimitError(error.message)) {
      return {
        ok: true,
        message: RATE_LIMIT_MESSAGE,
        profile: null,
      };
    }

    return { ok: false, error: mapSignUpError(error.message) };
  }

  if (data.session && data.user) {
    if (!isEmailVerifiedUser(data.user)) {
      await supabase.auth.signOut();
      return {
        ok: true,
        message: verificationSentMessage(),
        profile: { userId: data.user.id, email, username },
      };
    }

    return {
      ok: true,
      message: verificationSentMessage(),
      profile: { userId: data.user.id, email, username },
      redirectTo: "/onboarding",
    };
  }

  if (isDuplicateSignUp(data)) {
    return { ok: false, error: EXISTING_EMAIL_MESSAGE };
  }

  if (!data.user) {
    return { ok: false, error: EXISTING_EMAIL_MESSAGE };
  }

  return {
    ok: true,
    message: verificationSentMessage(),
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
    if (isRateLimitError(error.message)) {
      return { ok: false, error: RATE_LIMIT_MESSAGE };
    }

    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    message: "Verification email sent. Check your inbox for a new confirmation link.",
  };
}
