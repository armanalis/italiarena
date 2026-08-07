"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { navigateTo } from "@/lib/client-navigation";
import {
  isSamePasswordError,
  isSessionMissingError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES_SUMMARY,
  SAME_PASSWORD_MESSAGE,
  validateNewPassword,
} from "@/lib/password-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

const SIGN_IN_AFTER_RESET =
  "/auth/sign-out?next=" +
  encodeURIComponent("/login?success=password_reset");

/** Keep the recovery session alive for at least this long on the form. */
const MIN_SESSION_MS = 5 * 60 * 1000;
const KEEP_ALIVE_EVERY_MS = 60 * 1000;

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  // Keep the recovery session fresh while the user types (min 5 minutes).
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function ensureSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) {
          setMinutesLeft(0);
        }
        return;
      }

      const expiresAtMs = (session.expires_at ?? 0) * 1000;
      const remainingMs = expiresAtMs - Date.now();

      if (remainingMs < MIN_SESSION_MS) {
        const { data, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !data.session) {
          if (!cancelled) {
            setMinutesLeft(0);
          }
          return;
        }
        const refreshedRemaining =
          (data.session.expires_at ?? 0) * 1000 - Date.now();
        if (!cancelled) {
          setMinutesLeft(Math.max(1, Math.ceil(refreshedRemaining / 60_000)));
        }
        return;
      }

      if (!cancelled) {
        setMinutesLeft(Math.max(1, Math.ceil(remainingMs / 60_000)));
      }
    }

    void ensureSession();
    const intervalId = window.setInterval(() => {
      void ensureSession();
    }, KEEP_ALIVE_EVERY_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLinkExpired(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    const rules = validateNewPassword(password, confirmPassword);
    if (!rules.ok) {
      setError(rules.error);
      return;
    }

    setPending(true);

    try {
      const supabase = createClient();

      // Refresh first so a near-expiry token does not look "expired".
      await supabase.auth.refreshSession();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const {
        data: { user },
      } = session
        ? await supabase.auth.getUser()
        : { data: { user: null } };

      if (!session || !user) {
        setLinkExpired(true);
        setError(
          "Your reset link has expired. Request a new one from the login page."
        );
        setPending(false);
        return;
      }

      // Do NOT call signInWithPassword here — it can destroy the recovery session.
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        if (isSamePasswordError(updateError.message)) {
          setError(SAME_PASSWORD_MESSAGE);
        } else if (isSessionMissingError(updateError.message)) {
          setLinkExpired(true);
          setError(
            "Your reset link has expired. Request a new one from the login page."
          );
        } else {
          setError(updateError.message);
        }
        setPending(false);
        return;
      }

      navigateTo(SIGN_IN_AFTER_RESET);
    } catch {
      setError("Could not update password. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Password rules: {PASSWORD_RULES_SUMMARY}. It must be different from your
        current password.
        {minutesLeft !== null && minutesLeft > 0 ? (
          <>
            {" "}
            This reset session stays open for about {minutesLeft} minute
            {minutesLeft === 1 ? "" : "s"}.
          </>
        ) : null}
      </p>

      <div className="space-y-2">
        <Label htmlFor="reset-password">New password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reset-password"
            name="password"
            type="password"
            placeholder={PASSWORD_RULES_SUMMARY}
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            required
            disabled={pending}
            className="h-11 pl-10 dark:bg-white/5"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-confirm-password">Re-enter new password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reset-confirm-password"
            name="confirm_password"
            type="password"
            placeholder="Repeat your new password"
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            required
            disabled={pending}
            className="h-11 pl-10 dark:bg-white/5"
          />
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          <p>{error}</p>
          {linkExpired && (
            <p className="mt-2">
              <Link
                href="/login"
                className="font-medium underline underline-offset-4"
              >
                Go to login and request a new reset link
              </Link>
            </p>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Updating password..." : "Set new password"}
      </Button>
    </form>
  );
}
