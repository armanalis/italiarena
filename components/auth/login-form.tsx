/** Email/password form with sign-in, sign-up, and forgot-password flows. */
"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { ArrowLeft, Lock, Mail, Sparkles, UserRound } from "lucide-react";
import { ItalianBrandIcon } from "@/components/italian-brand-icon";
import { APP_NAME, PRIVACY_FOOTER_NOTICE, privacyHref } from "@/lib/legal";
import {
  requestPasswordReset,
  signIn,
  validateSignUpInput,
  type AuthFormState,
} from "@/app/login/actions";
import {
  resendVerificationOnClient,
  signUpOnClient,
} from "@/lib/auth-signup-client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useT, useUiLanguage } from "@/components/ui-language-provider";

type AuthMode = "signin" | "signup" | "forgot" | "resend";

const initialState: AuthFormState = { error: null, success: null };

function SubmitButton({
  mode,
  pendingOverride,
}: {
  mode: AuthMode;
  pendingOverride?: boolean;
}) {
  const t = useT();
  const { pending: formPending } = useFormStatus();
  const pending = pendingOverride ?? formPending;

  const label =
    mode === "signin"
      ? pending
        ? t("Signing in...")
        : t("Sign In")
      : mode === "signup"
        ? pending
          ? t("Creating account...")
          : t("Create Account")
        : mode === "resend"
          ? pending
            ? t("Sending email...")
            : t("Resend verification email")
          : pending
            ? t("Sending link...")
            : t("Send reset link");

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full "
    >
      {label}
    </Button>
  );
}

export function LoginForm({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const t = useT();
  const uiLanguage = useUiLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signInSuccess, setSignInSuccess] = useState<string | null>(null);
  const [clientAuthError, setClientAuthError] = useState<string | null>(null);
  const [clientAuthPending, setClientAuthPending] = useState(false);
  const [signInState, signInAction] = useActionState(signIn, initialState);
  const [forgotState, forgotAction] = useActionState(
    requestPasswordReset,
    initialState
  );

  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";
  const isResend = mode === "resend";
  const isEmailOnly = isForgot || isResend;
  const usesClientAuth = isSignUp || isResend;

  // Adjusted while rendering, not in effects, when one of these changes: a
  // new ?mode= link, a sent reset link (back to sign-in, with its message),
  // and a sign-in reply (the old message goes).
  const now = {
    initialMode,
    resetSent: forgotState.success,
    error: signInState.error,
    redirectTo: signInState.redirectTo,
  };
  const [seen, setSeen] = useState(now);
  const modeChanged = now.initialMode !== seen.initialMode;
  const resetChanged = now.resetSent !== seen.resetSent;
  const signInChanged = now.error !== seen.error || now.redirectTo !== seen.redirectTo;
  if (modeChanged || resetChanged || signInChanged) {
    setSeen(now);
    if (modeChanged) {
      setMode(initialMode);
    }
    if (resetChanged && forgotState.success) {
      setSignInSuccess(forgotState.success);
      setMode("signin");
    }
    if (signInChanged && (signInState.error || signInState.redirectTo)) {
      setSignInSuccess(null);
    }
  }

  async function handleClientAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientAuthError(null);
    setClientAuthPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      if (isSignUp) {
        const validation = await validateSignUpInput(formData);
        if (validation.error) {
          setClientAuthError(validation.error);
          return;
        }

        const result = await signUpOnClient({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          username: String(formData.get("username") ?? ""),
        });

        if (!result.ok) {
          setClientAuthError(result.error);
          setSignInSuccess(null);
          return;
        }

        if (result.redirectTo) {
          router.push(result.redirectTo);
          return;
        }

        setSignInSuccess(result.message);
        setClientAuthError(null);
        setMode("signin");
        return;
      }

      const result = await resendVerificationOnClient(
        String(formData.get("email") ?? "")
      );

      if (!result.ok) {
        setClientAuthError(result.error);
        return;
      }

      setSignInSuccess(result.message);
      setMode("signin");
    } finally {
      setClientAuthPending(false);
    }
  }

  const state = isSignIn ? signInState : isForgot ? forgotState : null;
  const successMessage = isSignIn ? signInSuccess : state?.success;
  const errorMessage =
    usesClientAuth
      ? clientAuthError
      : isSignIn && signInSuccess
        ? null
        : state?.error;
  const formAction = isSignIn ? signInAction : isForgot ? forgotAction : undefined;

  useActionRedirect(isSignIn ? signInState?.redirectTo : null);

  return (
    <div className="w-full max-w-[420px]">
      <div className="glass-panel overflow-hidden">
        <div className="border-b border-border px-5 pb-6 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
          <div className="mb-5 flex size-12 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            <ItalianBrandIcon className="size-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isForgot
              ? t("Enter your email and we'll send you a reset link.")
              : isResend
                ? t("Enter your email and we'll send a fresh verification link.")
                : t("Practice Italian or German through quick, real-time sessions with others at your level.")}
          </p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
          {!isEmailOnly ? (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 dark:bg-white/5">
              <button
                type="button"
                onClick={() => {
                  setSignInSuccess(null);
                  setClientAuthError(null);
                  setMode("signin");
                }}
                className={cn(
                  "rounded-full px-3 py-2.5 text-sm font-medium transition-all",
                  isSignIn
                    ? "bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("Sign In")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInSuccess(null);
                  setClientAuthError(null);
                  setMode("signup");
                }}
                className={cn(
                  "rounded-full px-3 py-2.5 text-sm font-medium transition-all",
                  isSignUp
                    ? "bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("Sign Up")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSignInSuccess(null);
                setClientAuthError(null);
                setMode("signin");
              }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {t("Back to sign in")}
            </button>
          )}

          {!isEmailOnly && (
            <>
              <GoogleSignInButton />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground dark:bg-card/60">
                    {isSignUp ? t("or continue with email") : t("or continue with email / username")}
                  </span>
                </div>
              </div>
            </>
          )}

          <form
            action={formAction}
            onSubmit={usesClientAuth ? (event) => void handleClientAuthSubmit(event) : undefined}
            className="space-y-4"
          >
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="auth-username">{t("Username")}</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-username"
                    name="username"
                    type="text"
                    placeholder={t("Your public username")}
                    required
                    minLength={2}
                    maxLength={24}
                    autoComplete="username"
                    className="h-11 pl-10 dark:bg-white/5"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("You can change this later in settings. Use it to sign in.")}
                </p>
              </div>
            )}

            {(isEmailOnly || isSignIn) && (
              <div className="space-y-2">
                <Label htmlFor={isEmailOnly ? "auth-email" : "auth-login"}>
                  {isEmailOnly ? t("Email") : t("Email or username")}
                </Label>
                <div className="relative">
                  {isEmailOnly ? (
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  ) : (
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  )}
                  <Input
                    id={isEmailOnly ? "auth-email" : "auth-login"}
                    name={isEmailOnly ? "email" : "login"}
                    type={isEmailOnly ? "email" : "text"}
                    placeholder={
                      isEmailOnly ? "you@example.com" : t("you@example.com or yourname")
                    }
                    required
                    autoComplete={isEmailOnly ? "email" : "username"}
                    className="h-11 pl-10 dark:bg-white/5"
                  />
                </div>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="auth-email">{t("Email")}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="h-11 pl-10 dark:bg-white/5"
                  />
                </div>
              </div>
            )}

            {!isEmailOnly && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="auth-password">{t("Password")}</Label>
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={() => {
                        setSignInSuccess(null);
                        setMode("forgot");
                      }}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {t("Forgot password?")}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-password"
                    name="password"
                    type="password"
                    placeholder={isSignIn ? t("Your password") : t("At least 6 characters")}
                    required
                    minLength={isSignIn ? undefined : 6}
                    autoComplete={isSignIn ? "current-password" : "new-password"}
                    className="h-11 pl-10 dark:bg-white/5"
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {t(errorMessage)}
              </div>
            )}

            {successMessage && (
              <div
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400"
                role="status"
              >
                {t(successMessage)}
              </div>
            )}

            <SubmitButton
              mode={mode}
              pendingOverride={usesClientAuth ? clientAuthPending : undefined}
            />
          </form>

          {!isEmailOnly && (
            <p className="text-center text-sm text-muted-foreground">
              {t("Just want to play with friends?")}{" "}
              <Link
                href="/guest"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("Play as a Guest")}
              </Link>
            </p>
          )}

          {isSignIn && (
            <p className="text-center text-sm text-muted-foreground">
              {t("Waiting on a verification email?")}{" "}
              <button
                type="button"
                onClick={() => {
                  setSignInSuccess(null);
                  setClientAuthError(null);
                  setMode("resend");
                }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("Resend verification email")}
              </button>
            </p>
          )}

          {isSignUp && (
            <>
              <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground dark:bg-white/5">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {t("New accounts pick a language and get matched by level after a quick setup.")}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                {t("By creating an account, you acknowledge our")}{" "}
                <Link
                  href={privacyHref(uiLanguage)}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("Privacy policy")}
                </Link>
                . {t(PRIVACY_FOOTER_NOTICE)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
