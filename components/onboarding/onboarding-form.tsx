/** Language and level picker shown to new users before their first match. */
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { GraduationCap, UserRound } from "lucide-react";
import {
  completeOnboarding,
  type OnboardingFormState,
} from "@/app/onboarding/actions";
import { signOut } from "@/app/login/actions";
import { PROFICIENCY_LEVELS, TARGET_LANGUAGE } from "@/lib/constants";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type OnboardingFormProps = {
  defaultUsername?: string | null;
};

const initialState: OnboardingFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 dark:shadow-indigo-950/50"
    >
      {pending ? "Saving..." : "Continue to Dashboard"}
    </Button>
  );
}

export function OnboardingForm({ defaultUsername = "" }: OnboardingFormProps) {
  const [state, formAction] = useActionState(completeOnboarding, initialState);
  useActionRedirect(state?.redirectTo);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-card/60 dark:shadow-indigo-950/40">
      <div className="border-b border-border/60 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10 px-5 pb-6 pt-6 dark:border-white/10 sm:px-8 sm:pb-7 sm:pt-8">
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <GraduationCap className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Let&apos;s set up your profile
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose your Italian level so we can match you with the right opponents.
        </p>
      </div>

      <form action={formAction} className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
        <input type="hidden" name="target_language" value={TARGET_LANGUAGE} />

        <div className="space-y-2">
          <Label htmlFor="username" className="flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" />
            Username
          </Label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={2}
            maxLength={24}
            defaultValue={defaultUsername ?? ""}
            autoComplete="username"
            placeholder="Used to sign in and shown to opponents"
            className={cn(
              "flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm",
              "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "dark:bg-white/5"
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proficiency_level">Proficiency Level</Label>
          <select
            id="proficiency_level"
            name="proficiency_level"
            required
            defaultValue=""
            className={cn(
              "flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm",
              "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "dark:bg-white/5"
            )}
          >
            <option value="" disabled>
              Select your level
            </option>
            {PROFICIENCY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {state?.error && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </div>
        )}

        <SubmitButton />
      </form>

      <form action={signOut} className="border-t border-border/60 px-5 py-4 text-center sm:px-8">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-medium text-indigo-400 underline-offset-4 hover:underline"
        >
          Sign out and use a different account
        </button>
      </form>
    </div>
  );
}
