/** Google Identity Services helpers for in-app Sign in with Google. */

export function getGoogleWebClientId() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return clientId || null;
}

/**
 * Google hashes the nonce before putting it in the ID token. Pass the hashed
 * value to GIS and the original value to Supabase `signInWithIdToken`.
 */
export async function generateGoogleNoncePair() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(nonce)
  );
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return { nonce, hashedNonce };
}

export function mapGoogleSignInError(message: string) {
  const lowered = message.toLowerCase();
  if (
    lowered.includes("provider is not enabled") ||
    lowered.includes("unsupported provider")
  ) {
    return "Google sign-in is not enabled for this app yet. Use email/username and password, or ask the admin to enable Google in Supabase.";
  }
  if (
    lowered.includes("audience") ||
    lowered.includes("client id") ||
    lowered.includes("invalid jwt")
  ) {
    return "Google sign-in is not fully configured yet. Add the Web client ID to NEXT_PUBLIC_GOOGLE_CLIENT_ID and to Supabase → Authentication → Providers → Google, then try again.";
  }
  if (lowered.includes("nonce")) {
    return "Google sign-in expired before it finished. Try Continue with Google again.";
  }
  return message;
}
