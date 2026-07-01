/** Email/password form with sign-in, sign-up, and forgot-password flows. */
"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { ArrowLeft, Lock, Mail, Sparkles, UserRound } from "lucide-react";
import { ItalianBrandIcon } from "@/components/italian-brand-icon";
import { APP_NAME, PRIVACY_FOOTER_NOTICE } from "@/lib/legal";
import {
  requestPasswordReset,
  resendVerificationEmail,
  signIn,
  signUp,
  type AuthFormState,
} from "@/app/login/actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup" | "forgot" | "resend";

const initialState: AuthFormState = { error: null, success: null };

function SubmitButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus();

  const label =
    mode === "signin"
      ? pending
        ? "Signing in..."
        : "Sign In"
      : mode === "signup"
        ? pending
          ? "Creating account..."
          : "Create Account"
        : mode === "resend"
          ? pending
            ? "Sending email..."
            : "Resend verification email"
          : pending
            ? "Sending link..."
            : "Send reset link";

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

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [signInSuccess, setSignInSuccess] = useState<string | null>(null);
  const [signInState, signInAction] = useActionState(signIn, initialState);
  const [signUpState, signUpAction] = useActionState(signUp, initialState);
  const [forgotState, forgotAction] = useActionState(
    requestPasswordReset,
    initialState
  );
  const [resendState, resendAction] = useActionState(
    resendVerificationEmail,
    initialState
  );

  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";
  const isResend = mode === "resend";
  const isEmailOnly = isForgot || isResend;

  useEffect(() => {
    if (signUpState.success) {
      setSignInSuccess(signUpState.success);
      setMode("signin");
    }
  }, [signUpState.success]);

  useEffect(() => {
    if (forgotState.success) {
      setSignInSuccess(forgotState.success);
      setMode("signin");
    }
  }, [forgotState.success]);

  useEffect(() => {
    if (resendState.success) {
      setSignInSuccess(resendState.success);
      setMode("signin");
    }
  }, [resendState.success]);

  const state = isSignIn
    ? signInState
    : isSignUp
      ? signUpState
      : isResend
        ? resendState
        : forgotState;
  const successMessage = isSignIn ? signInSuccess : state?.success;
  const formAction = isSignIn
    ? signInAction
    : isSignUp
      ? signUpAction
      : isResend
        ? resendAction
        : forgotAction;

  useActionRedirect(
    isSignIn
      ? signInState?.redirectTo
      : isSignUp
        ? signUpState?.redirectTo
        : null
  );

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
              ? "Enter your email and we'll send you a reset link."
              : isResend
                ? "Enter your email and we'll send a fresh verification link."
                : "Practice Italian through quick, real-time sessions with others at your level."}
          </p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
          {!isEmailOnly ? (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 dark:bg-white/5">
              <button
                type="button"
                onClick={() => {
                  setSignInSuccess(null);
                  setMode("signin");
                }}
                className={cn(
                  "rounded-full px-3 py-2.5 text-sm font-medium transition-all",
                  isSignIn
                    ? "bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInSuccess(null);
                  setMode("signup");
                }}
                className={cn(
                  "rounded-full px-3 py-2.5 text-sm font-medium transition-all",
                  isSignUp
                    ? "bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSignInSuccess(null);
                setMode("signin");
              }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
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
                    {isSignUp ? "or continue with email" : "or continue with email / username"}
                  </span>
                </div>
              </div>
            </>
          )}

          <form action={formAction} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="auth-username">Username</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-username"
                    name="username"
                    type="text"
                    placeholder="Your public username"
                    required
                    minLength={2}
                    maxLength={24}
                    autoComplete="username"
                    className="h-11 pl-10 dark:bg-white/5"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You can change this later in settings. Use it to sign in.
                </p>
              </div>
            )}

            {(isEmailOnly || isSignIn) && (
              <div className="space-y-2">
                <Label htmlFor={isEmailOnly ? "auth-email" : "auth-login"}>
                  {isEmailOnly ? "Email" : "Email or username"}
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
                      isEmailOnly ? "you@example.com" : "you@example.com or yourname"
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
                <Label htmlFor="auth-email">Email</Label>
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
                  <Label htmlFor="auth-password">Password</Label>
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={() => {
                        setSignInSuccess(null);
                        setMode("forgot");
                      }}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-password"
                    name="password"
                    type="password"
                    placeholder={isSignIn ? "Your password" : "At least 6 characters"}
                    required
                    minLength={isSignIn ? undefined : 6}
                    autoComplete={isSignIn ? "current-password" : "new-password"}
                    className="h-11 pl-10 dark:bg-white/5"
                  />
                </div>
              </div>
            )}

            {state?.error && (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {state?.error}
              </div>
            )}

            {successMessage && (
              <div
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400"
                role="status"
              >
                {successMessage}
              </div>
            )}

            <SubmitButton mode={mode} />
          </form>

          {!isEmailOnly && (
            <p className="text-center text-sm text-muted-foreground">
              Just want to play with friends?{" "}
              <Link
                href="/guest"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Play as a Guest
              </Link>
            </p>
          )}

          {isSignIn && (
            <p className="text-center text-sm text-muted-foreground">
              Waiting on a verification email?{" "}
              <button
                type="button"
                onClick={() => {
                  setSignInSuccess(null);
                  setMode("resend");
                }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Resend verification email
              </button>
            </p>
          )}

          {isSignUp && (
            <>
              <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground dark:bg-white/5">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                New accounts get matched by Italian level after a quick setup.
              </p>
              <p className="text-center text-xs text-muted-foreground">
                By creating an account, you acknowledge our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Privacy policy
                </Link>
                . {PRIVACY_FOOTER_NOTICE}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
