"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import {
  resetPassword,
  type AuthFormState,
} from "@/app/login/actions";
import { navigateTo } from "@/lib/client-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

const initialState: AuthFormState = { error: null };
const SIGN_IN_AFTER_RESET = "/login?success=password_reset";

function SubmitButton({ finishing }: { finishing: boolean }) {
  const { pending } = useFormStatus();
  const busy = pending || finishing;

  return (
    <Button type="submit" disabled={busy} className="h-11 w-full">
      {busy ? "Updating password..." : "Set new password"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, initialState);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!state?.redirectTo || finishing) {
      return;
    }

    let cancelled = false;
    setFinishing(true);

    void (async () => {
      try {
        // Clear the recovery session in the browser so /login cannot bounce to dashboard.
        const supabase = createClient();
        await supabase.auth.signOut({ scope: "global" });
      } catch {
        // Still send the user to sign-in; middleware also clears leftover sessions.
      }

      if (!cancelled) {
        navigateTo(state.redirectTo ?? SIGN_IN_AFTER_RESET);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state?.redirectTo, finishing]);

  return (
    <form action={formAction} className="space-y-4">
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
            className="h-11 pl-10 dark:bg-white/5"
          />
        </div>
      </div>

      {state?.error && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <SubmitButton finishing={finishing} />
    </form>
  );
}
