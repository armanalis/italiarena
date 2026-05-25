"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import {
  resetPassword,
  type AuthFormState,
} from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
    >
      {pending ? "Updating password..." : "Set new password"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, initialState);

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
        <Label htmlFor="reset-confirm-password">Confirm new password</Label>
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

      {state.error && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
