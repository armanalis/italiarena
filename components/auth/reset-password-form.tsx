"use client";

import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { navigateTo } from "@/lib/client-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

const SIGN_IN_AFTER_RESET =
  "/auth/sign-out?next=" +
  encodeURIComponent("/login?success=password_reset");

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (!password || !confirmPassword) {
      setError("Both password fields are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "Your reset link has expired. Request a new one from the login page."
        );
        setPending(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setPending(false);
        return;
      }

      // Hard navigation through a route that clears cookies on the redirect
      // response — never leave the recovery session alive (that sends users
      // to the dashboard as signed-in).
      navigateTo(SIGN_IN_AFTER_RESET);
    } catch {
      setError("Could not update password. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-password">New password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reset-password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            minLength={6}
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
            minLength={6}
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
          {error}
        </div>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Updating password..." : "Set new password"}
      </Button>
    </form>
  );
}
