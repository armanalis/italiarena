import { createClient } from "@/utils/supabase/client";

type GuestAuthResult = { ok: true } | { ok: false; error: string };

function guestSignUpEmail() {
  return `guest-${crypto.randomUUID()}@guest.local`;
}

function guestSignUpPassword() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

/** Try anonymous sign-in, then disposable email sign-up. No service role required. */
export async function signInGuestOnClient(): Promise<GuestAuthResult> {
  const supabase = createClient();

  const { data: anonData, error: anonError } =
    await supabase.auth.signInAnonymously();

  if (!anonError && anonData.session) {
    return { ok: true };
  }

  const email = guestSignUpEmail();
  const password = guestSignUpPassword();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (!signUpError && signUpData.session) {
    return { ok: true };
  }

  if (!signUpError && signUpData.user) {
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (!signInError && signInData.session) {
      return { ok: true };
    }

    if (signInError) {
      return {
        ok: false,
        error:
          "Guest sign-in needs Anonymous sign-in enabled in Supabase (Authentication → Providers → Anonymous).",
      };
    }
  }

  return {
    ok: false,
    error:
      anonError?.message ??
      signUpError?.message ??
      "Could not start a guest session. Please try again.",
  };
}
