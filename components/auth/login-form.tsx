/** Email/password form with sign-in, sign-up, and forgot-password flows. */
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Languages, Lock, Mail, Sparkles } from "lucide-react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  type AuthFormState,
} from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup" | "forgot";

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
        : pending
          ? "Sending link..."
          : "Send reset link";

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 dark:shadow-indigo-950/50"
    >
      {label}
    </Button>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [signInState, signInAction] = useActionState(signIn, initialState);
  const [signUpState, signUpAction] = useActionState(signUp, initialState);
  const [forgotState, forgotAction] = useActionState(
    requestPasswordReset,
    initialState
  );

  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";

  const state = isSignIn ? signInState : isSignUp ? signUpState : forgotState;
  const formAction = isSignIn
    ? signInAction
    : isSignUp
      ? signUpAction
      : forgotAction;

  return (
    <div className="w-full max-w-[420px]">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-card/60 dark:shadow-indigo-950/40">
        <div className="border-b border-border/60 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10 px-5 pb-6 pt-6 dark:border-white/10 sm:px-8 sm:pb-7 sm:pt-8">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <Languages className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Language Quiz</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isForgot
              ? "Enter your email and we'll send you a reset link."
              : "Practice a new language through quick, real-time sessions with others at your level."}
          </p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
          {!isForgot ? (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isSignIn
                    ? "bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
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
              onClick={() => setMode("signin")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
            </button>
          )}

          <form action={formAction} className="space-y-4">
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

            {!isForgot && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="auth-password">Password</Label>
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
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

            {state.error && (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {state.error}
              </div>
            )}

            {state.success && (
              <div
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400"
                role="status"
              >
                {state.success}
              </div>
            )}

            <SubmitButton mode={mode} />
          </form>

          {isSignUp && (
            <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground dark:bg-white/5">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-indigo-400" />
              New accounts get matched by language and proficiency level after a
              quick setup.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
