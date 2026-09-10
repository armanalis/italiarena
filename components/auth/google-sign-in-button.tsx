"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import {
  generateGoogleNoncePair,
  getGoogleWebClientId,
  mapGoogleSignInError,
} from "@/lib/google-identity";
import { getClientAuthCallbackUrl } from "@/lib/site-url";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const { resolvedTheme } = useTheme();
  const clientId = getGoogleWebClientId();
  const buttonHostRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const [gisButtonReady, setGisButtonReady] = useState(false);
  const [gisUnavailable, setGisUnavailable] = useState(false);

  useEffect(() => setMounted(true), []);

  const finishWithSession = useCallback(() => {
    window.location.assign("/onboarding");
  }, []);

  const startOAuthRedirect = useCallback(async () => {
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getClientAuthCallbackUrl(),
      },
    });

    if (oauthError) {
      throw oauthError;
    }
  }, []);

  const signInWithGoogleIdToken = useCallback(
    async (credential: string, nonce: string) => {
      const supabase = createClient();
      const { error: tokenError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
        nonce,
      });

      if (tokenError) {
        throw tokenError;
      }

      finishWithSession();
    },
    [finishWithSession]
  );

  useEffect(() => {
    if (
      !mounted ||
      !clientId ||
      !gsiReady ||
      initializedRef.current ||
      gisUnavailable
    ) {
      return;
    }

    const host = buttonHostRef.current;
    const googleId = window.google?.accounts.id;
    if (!host || !googleId) {
      return;
    }

    const width = Math.max(
      200,
      Math.min(Math.floor(host.clientWidth || 320), 400)
    );
    let cancelled = false;

    void (async () => {
      const { nonce, hashedNonce } = await generateGoogleNoncePair();
      if (cancelled || !buttonHostRef.current || initializedRef.current) {
        return;
      }

      initializedRef.current = true;
      host.replaceChildren();
      googleId.initialize({
        client_id: clientId,
        ux_mode: "popup",
        itp_support: true,
        nonce: hashedNonce,
        callback: (response) => {
          setLoading(true);
          setError(null);
          void signInWithGoogleIdToken(response.credential, nonce).catch(
            (tokenError: unknown) => {
              const message =
                tokenError instanceof Error
                  ? tokenError.message
                  : "Google sign-in failed.";
              setError(mapGoogleSignInError(message));
              setLoading(false);
            }
          );
        },
      });
      googleId.renderButton(host, {
        type: "standard",
        theme: resolvedTheme === "light" ? "outline" : "filled_black",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width,
        logo_alignment: "left",
      });
      if (!cancelled) {
        setGisButtonReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    mounted,
    clientId,
    gsiReady,
    gisUnavailable,
    resolvedTheme,
    signInWithGoogleIdToken,
  ]);

  async function handleOAuthFallback() {
    setLoading(true);
    setError(null);

    try {
      await startOAuthRedirect();
    } catch (oauthError) {
      const message =
        oauthError instanceof Error
          ? oauthError.message
          : "Google sign-in failed.";
      setError(mapGoogleSignInError(message));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {clientId && !gisUnavailable ? (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onReady={() => setGsiReady(true)}
            onError={() => setGisUnavailable(true)}
          />
          <div className="relative min-h-11 w-full">
            <div
              ref={buttonHostRef}
              className="flex h-11 w-full items-center justify-center overflow-hidden [&>div]:w-full"
            />
            {(!gisButtonReady || loading) && (
              <div className="absolute inset-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full gap-2.5 bg-background text-base font-medium"
                  disabled={loading}
                  onClick={() => void handleOAuthFallback()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Signing in with Google...
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      Continue with Google
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2.5 bg-background text-base font-medium"
          disabled={loading}
          onClick={() => void handleOAuthFallback()}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Redirecting to Google...
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </Button>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
